import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import * as matchmakingService from "./matchmaking.service.js";
import { allowedOrigins } from "../config/cors.js";

export const initSocketServer = (httpServer) => {

    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
        },
    });


    io.use((socket, next) => {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            return next(new Error("Authentication error: No cookies found"));
        }

        const parsedCookies = cookie.parse(cookies);
        const token = parsedCookies.access_token;

        if (!token) {
            return next(new Error("Authentication error: No access token"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (error) {
            const err = new Error("Authentication error");
            err.data = { message: "Invalid or expired token" };
            next(err);
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.userId}`);

        const existingSocket = matchmakingService.userToSocket.get(
            socket.userId,
        );
        if (existingSocket && existingSocket.id !== socket.id) {
            existingSocket.emit("session-terminated", {
                reason: "another_session_detected",
            });
            existingSocket.disconnect(true);
        }

        matchmakingService.userToSocket.set(socket.userId, socket);

        socket.on("search", () => matchmakingService.handleSearch(socket));
        socket.on("offer", (data) =>
            matchmakingService.handleOffer(socket, data),
        );
        socket.on("answer", (data) =>
            matchmakingService.handleAnswer(socket, data),
        );
        socket.on("ice-candidate", (data) =>
            matchmakingService.handleIceCandidate(socket, data),
        );
        socket.on("skip", () => matchmakingService.handleSkip(socket));
        socket.on("stop-search", () => matchmakingService.handleStopSearch(socket));
        socket.on("send-message", (data) =>
            matchmakingService.handleMessage(socket, data),
        );

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.userId}`);
            matchmakingService.handleDisconnect(socket);
        });
    });

    return io;
};
