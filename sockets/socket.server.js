import { Server } from "socket.io";
import cookie from "cookie";
import { verifyAccessToken } from "../utils/jwt.js";
import UserRepository from "../repositories/user.repository.js";
import MatchSessionRepository from "../repositories/matchSession.repository.js";
import SignalingService from "../services/signaling.service.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import PresenceService from "../services/presence.service.js";
import ReconnectService from "../services/reconnect.service.js";
import { MAX_SOCKET_CONNECTIONS_PER_USER, SOCKET_MESSAGE_SIZE_LIMIT } from "../utils/constants.js";
import { logger } from "../utils/appError.js";
import { 
    offerSchema, 
    answerSchema, 
    iceCandidateSchema, 
    connectionStateSchema, 
    iceRestartSchema 
} from "../validations/socket.schema.js";

let io;

export const initSocketServer = async (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
        },
        maxHttpBufferSize: 1e6,
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    const pubClient = createClient({
        url: process.env.REDIS_URL,
    });

    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) =>
        logger.error("Redis PubClient Error", { error: err.message })
    );

    subClient.on("error", (err) =>
        logger.error("Redis SubClient Error", { error: err.message })
    );

    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));

    logger.info("Socket.IO Redis adapter connected");

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

            const user = await UserRepository.findById(decoded.userId);

            if (!user || user.isCurrentlyBanned()) {
                return next(new Error("Authentication error"));
            }

            const userId = user._id.toString();
            const existingConnections = await io.in(userId).fetchSockets();
            
            if (existingConnections.length >= MAX_SOCKET_CONNECTIONS_PER_USER) {
                return next(new Error("Maximum connections exceeded"));
            }

            socket.user = {
                id: userId,
                role: user.role,
            };

            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.user.id;

        logger.info(`User connected: ${userId}`, { socketId: socket.id });

        socket.join(userId);

        // Mark presence (multi-tab safe)
        await PresenceService.incrementConnection(userId);

        // ---------------- RECONNECT RESUME LOGIC ----------------
        const activeSession = await MatchSessionRepository.findOne({
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

        socket.on("offer", async (data) => {
            try {
                const validated = offerSchema.parse(data);
                const { sessionId, offer } = validated;
                
                logger.debug(`Offer received from ${userId}`, { sessionId });
                if (JSON.stringify(offer).length > SOCKET_MESSAGE_SIZE_LIMIT) {
                    return socket.emit("signalingError", {
                        message: "Offer too large",
                    });
                }
                await SignalingService.relayOffer(userId, sessionId, offer);
            } catch (err) {
                logger.error(`Offer error for ${userId}`, { error: err.message });
                socket.emit("signalingError", {
                    message: err.message || "Invalid offer data",
                });
            }
        });

        socket.on("answer", async (data) => {
            try {
                const validated = answerSchema.parse(data);
                const { sessionId, answer } = validated;
                
                logger.debug(`Answer received from ${userId}`, { sessionId });
                if (JSON.stringify(answer).length > SOCKET_MESSAGE_SIZE_LIMIT) {
                    return socket.emit("signalingError", {
                        message: "Answer too large",
                    });
                }
                await SignalingService.relayAnswer(userId, sessionId, answer);
            } catch (err) {
                logger.error(`Answer error for ${userId}`, { error: err.message });
                socket.emit("signalingError", {
                    message: err.message || "Invalid answer data",
                });
            }
        });

        socket.on("ice-candidate", async (data) => {
            try {
                const validated = iceCandidateSchema.parse(data);
                const { sessionId, candidate } = validated;
                
                await SignalingService.relayIceCandidate(
                    userId,
                    sessionId,
                    candidate,
                );
            } catch (err) {
                socket.emit("signalingError", {
                    message: err.message || "Invalid candidate data",
                });
            }
        });

        socket.on("connection-state", async (data) => {
            try {
                const validated = connectionStateSchema.parse(data);
                const { sessionId, state } = validated;
                
                const session = await MatchSessionRepository.findById(sessionId);
                if (!session || session.status !== "ACTIVE") return;

                const partnerId =
                    session.userA.toString() === userId
                        ? session.userB.toString()
                        : session.userA.toString();

                io.to(partnerId).emit("partner-connection-state", {
                    sessionId,
                    state,
                });
            } catch (err) {
                logger.error("Connection state error", { error: err.message });
            }
        });

        socket.on("ice-restart", async (data) => {
            try {
                const validated = iceRestartSchema.parse(data);
                const { sessionId } = validated;
                
                const session = await MatchSessionRepository.findById(sessionId);
                if (!session || session.status !== "ACTIVE") {
                    return socket.emit("signalingError", {
                        message: "Invalid session",
                    });
                }

                const isParticipant =
                    session.userA.toString() === userId ||
                    session.userB.toString() === userId;

                if (!isParticipant) {
                    return socket.emit("signalingError", {
                        message: "Unauthorized",
                    });
                }

                const partnerId =
                    session.userA.toString() === userId
                        ? session.userB.toString()
                        : session.userA.toString();

                io.to(partnerId).emit("ice-restart-request", {
                    sessionId,
                });
            } catch (err) {
                socket.emit("signalingError", {
                    message: err.message || "Invalid restart data",
                });
            }
        });

        socket.on("disconnect", async () => {
            logger.info(`User disconnected: ${userId}`, { socketId: socket.id });

            try {
                const remainingConnections =
                    await PresenceService.decrementConnection(userId);

                // If another tab still active → do nothing
                if (remainingConnections > 0) {
                    return;
                }

                const session = await MatchSessionRepository.findOne({
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
                logger.error("Disconnect handling error", { error: err.message });
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
