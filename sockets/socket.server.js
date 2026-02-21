import { Server } from "socket.io";
import cookie from "cookie";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import MatchSession from "../models/MatchSession.js";
import SignalingService from "../services/signaling.service.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import PresenceService from "../services/presence.service.js";
import ReconnectService from "../services/reconnect.service.js";

let io;

export const initSocketServer = async (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
        },
    });

    // ================= REDIS ADAPTER =================
    const pubClient = createClient({
        url: process.env.REDIS_URL,
    });

    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) =>
        console.error("Redis PubClient Error:", err),
    );

    subClient.on("error", (err) =>
        console.error("Redis SubClient Error:", err),
    );

    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));

    console.log("Socket.IO Redis adapter connected");

    // ================= SOCKET AUTH =================
    io.use(async (socket, next) => {
        try {
            const rawCookies = socket.handshake.headers.cookie;

            if (!rawCookies) {
                return next(new Error("Authentication error"));
            }

            const parsedCookies = cookie.parse(rawCookies);
            const token = parsedCookies.accessToken;

            if (!token) {
                return next(new Error("Authentication error"));
            }

            const decoded = verifyAccessToken(token);

            const user = await User.findById(decoded.userId);

            if (!user || user.isCurrentlyBanned()) {
                return next(new Error("Authentication error"));
            }

            socket.user = {
                id: user._id.toString(),
                role: user.role,
            };

            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    // ================= CONNECTION =================
    io.on("connection", async (socket) => {
        const userId = socket.user.id;

        console.log("User connected:", userId);

        socket.join(userId);

        // Mark presence (multi-tab safe)
        await PresenceService.incrementConnection(userId);

        // ---------------- RECONNECT RESUME LOGIC ----------------
        const activeSession = await MatchSession.findOne({
            $or: [{ userA: userId }, { userB: userId }],
            status: "ACTIVE",
        });

        if (activeSession) {
            const reconnectExists = await ReconnectService.hasReconnectWindow(
                activeSession._id.toString(),
                userId,
            );

            if (reconnectExists) {
                await ReconnectService.clearReconnect(
                    activeSession._id.toString(),
                    userId,
                );

                const partnerId =
                    activeSession.userA.toString() === userId
                        ? activeSession.userB.toString()
                        : activeSession.userA.toString();

                io.to(partnerId).emit("sessionResumed", {
                    sessionId: activeSession._id,
                });

                socket.emit("sessionResumed", {
                    sessionId: activeSession._id,
                });
            }
        }

        // ---------------- SIGNALING EVENTS ----------------

        socket.on("offer", async ({ sessionId, offer }) => {
            try {
                await SignalingService.relayOffer(userId, sessionId, offer);
            } catch (err) {
                socket.emit("signalingError", {
                    message: err.message,
                });
            }
        });

        socket.on("answer", async ({ sessionId, answer }) => {
            try {
                await SignalingService.relayAnswer(userId, sessionId, answer);
            } catch (err) {
                socket.emit("signalingError", {
                    message: err.message,
                });
            }
        });

        socket.on("ice-candidate", async ({ sessionId, candidate }) => {
            try {
                await SignalingService.relayIceCandidate(
                    userId,
                    sessionId,
                    candidate,
                );
            } catch (err) {
                socket.emit("signalingError", {
                    message: err.message,
                });
            }
        });

        // ---------------- DISCONNECT HANDLING ----------------

        socket.on("disconnect", async () => {
            console.log("User disconnected:", userId);

            try {
                const remainingConnections =
                    await PresenceService.decrementConnection(userId);

                // If another tab still active → do nothing
                if (remainingConnections > 0) {
                    return;
                }

                const session = await MatchSession.findOne({
                    $or: [{ userA: userId }, { userB: userId }],
                    status: "ACTIVE",
                });

                if (!session) return;

                // Mark temporary disconnect (15s grace window)
                await ReconnectService.markDisconnected(
                    session._id.toString(),
                    userId,
                );

                const partnerId =
                    session.userA.toString() === userId
                        ? session.userB.toString()
                        : session.userA.toString();

                io.to(partnerId).emit("partnerDisconnected", {
                    sessionId: session._id,
                    graceSeconds: 15,
                });
            } catch (err) {
                console.error("Disconnect handling error:", err);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};
