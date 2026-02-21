import { Server } from "socket.io";
import cookie from "cookie";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import MatchSession from "../models/MatchSession.js";
import SignalingService from "../services/signaling.service.js";

let io;

export const initSocketServer = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
        },
    });

    // socket auth
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

    // connection
    io.on("connection", (socket) => {
        console.log("User connected:", socket.user.id);

        socket.join(socket.user.id);

        socket.on("offer", async ({ sessionId, offer }) => {
            try {
                await SignalingService.relayOffer(
                    socket.user.id,
                    sessionId,
                    offer,
                );
            } catch (err) {
                socket.emit("error", err.message);
            }
        });

        socket.on("answer", async ({ sessionId, answer }) => {
            try {
                await SignalingService.relayAnswer(
                    socket.user.id,
                    sessionId,
                    answer,
                );
            } catch (err) {
                socket.emit("error", err.message);
            }
        });

        socket.on("ice-candidate", async ({ sessionId, candidate }) => {
            try {
                await SignalingService.relayIceCandidate(
                    socket.user.id,
                    sessionId,
                    candidate,
                );
            } catch (err) {
                socket.emit("error", err.message);
            }
        });

        // disconnect
        socket.on("disconnect", async () => {
            console.log("User disconnected:", socket.user.id);

            try {
                const session = await MatchSession.findOne({
                    $or: [{ userA: socket.user.id }, { userB: socket.user.id }],
                    status: "ACTIVE",
                });

                if (session) {
                    session.status = "ENDED";
                    session.endedAt = new Date();
                    await session.save();

                    const partnerId =
                        session.userA.toString() === socket.user.id
                            ? session.userB.toString()
                            : session.userA.toString();

                    io.to(partnerId).emit("matchEnded", {
                        sessionId: session._id,
                    });
                }
            } catch (err) {
                console.error("Disconnect cleanup error:", err);
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
