import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import * as matchmakingService from "./matchmaking.service.js";
import { allowedOrigins } from "../config/cors.js";

/**
 * How long (ms) before a socket's JWT expires do we proactively warn it.
 * e.g. if the token has 2 minutes left, we emit "token-expiring-soon"
 * so the client can refresh BEFORE the connection drops.
 */
const TOKEN_REFRESH_WARNING_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Wraps a socket event handler in try/catch.
 * Prevents a synchronous throw from becoming an unhandled exception
 * that crashes the entire Node process.
 */
function safeHandler(socket, eventName, fn) {
    return (...args) => {
        try {
            fn(...args);
        } catch (err) {
            console.error(
                `[socket] Error in "${eventName}" handler for user ${socket.userId}:`,
                err
            );
            socket.emit("error", { message: "An unexpected error occurred." });
        }
    };
}

/**
 * Schedules a "token-expiring-soon" warning and an auto-disconnect
 * timed to fire when the socket's JWT expires.
 *
 * Why both timers?
 *  - Warning timer:    fires TOKEN_REFRESH_WARNING_MS before expiry.
 *                      Client should call /api/auth/refresh over HTTP,
 *                      then reconnect the socket with the new cookie.
 *  - Expiry timer:     fires exactly at token expiry. If the client
 *                      didn't refresh in time, we disconnect cleanly
 *                      rather than leaving a socket open with a dead token.
 *
 * Both timers are stored on the socket instance so they can be cleared
 * if the socket disconnects before they fire (prevents a timer holding
 * a reference to a dead socket).
 *
 * @param {Socket} socket   - The authenticated socket
 * @param {number} exp      - JWT `exp` claim (Unix seconds)
 */
function scheduleTokenExpiry(socket, exp) {
    const nowMs = Date.now();
    const expiresInMs = exp * 1000 - nowMs;

    // Token is already expired or expires in < 1s — disconnect immediately.
    // This shouldn't happen if the auth middleware is working, but is a
    // safety net against clock skew or very short-lived tokens.
    if (expiresInMs <= 1000) {
        socket.emit("token-expired", {
            code: "TOKEN_EXPIRED",
            message: "Session expired. Please refresh and reconnect.",
        });
        socket.disconnect(true);
        return;
    }

    // Warning timer — fires before expiry so the client can refresh proactively
    const warningInMs = expiresInMs - TOKEN_REFRESH_WARNING_MS;
    if (warningInMs > 0) {
        socket._tokenWarningTimer = setTimeout(() => {
            if (socket.connected) {
                socket.emit("token-expiring-soon", {
                    code: "TOKEN_EXPIRING_SOON",
                    message: "Your session is about to expire. Please refresh.",
                    expiresInMs: TOKEN_REFRESH_WARNING_MS,
                });
            }
        }, warningInMs);
    }

    // Expiry timer — disconnect when the token actually expires
    socket._tokenExpiryTimer = setTimeout(() => {
        if (socket.connected) {
            socket.emit("token-expired", {
                code: "TOKEN_EXPIRED",
                message: "Session expired. Please refresh and reconnect.",
            });
            socket.disconnect(true);
        }
    }, expiresInMs);
}

/**
 * Clears both token timers when a socket disconnects.
 * Prevents the timer callbacks from running against a dead socket
 * and keeps the Node event loop clean.
 */
function clearTokenTimers(socket) {
    if (socket._tokenWarningTimer) {
        clearTimeout(socket._tokenWarningTimer);
        socket._tokenWarningTimer = null;
    }
    if (socket._tokenExpiryTimer) {
        clearTimeout(socket._tokenExpiryTimer);
        socket._tokenExpiryTimer = null;
    }
}

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

    // ── Auth middleware ───────────────────────────────────────────────────────
    io.use((socket, next) => {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            const err = new Error("Authentication error");
            err.data = { code: "NO_COOKIE", message: "No cookies found." };
            return next(err);
        }

        const parsedCookies = cookie.parse(cookies);
        const token = parsedCookies.access_token;

        if (!token) {
            const err = new Error("Authentication error");
            err.data = { code: "NO_TOKEN", message: "No access token found." };
            return next(err);
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            socket.userId = decoded.userId;
            // Store exp on the socket so we can schedule expiry timers
            // after the connection is established
            socket._tokenExp = decoded.exp;
            next();
        } catch (error) {
            const err = new Error("Authentication error");

            if (error.name === "TokenExpiredError") {
                // Client SHOULD refresh via HTTP and reconnect.
                // This is a recoverable state — the user is still logged in,
                // they just need a new access token.
                err.data = {
                    code: "TOKEN_EXPIRED",
                    message: "Access token expired. Refresh and reconnect.",
                };
            } else {
                // Truly invalid token — bad signature, malformed, etc.
                // Client should NOT retry — redirect to login.
                err.data = {
                    code: "TOKEN_INVALID",
                    message: "Invalid access token.",
                };
            }

            next(err);
        }
    });

    // ── Connection handler ────────────────────────────────────────────────────
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // ── Duplicate session handling ────────────────────────────────────────
        const existingSocket = matchmakingService.userToSocket.get(socket.userId);
        if (existingSocket && existingSocket.id !== socket.id) {
            // Clear the old socket's timers before kicking it
            clearTokenTimers(existingSocket);
            existingSocket.emit("session-terminated", {
                reason: "another_session_detected",
            });
            existingSocket.disconnect(true);
        }

        // Register the new socket
        matchmakingService.userToSocket.set(socket.userId, socket);

        // ── Schedule token expiry handling ────────────────────────────────────
        // Now that the connection is live, set timers based on the JWT exp claim.
        // This handles the mid-session expiry case — previously a token could
        // expire and the socket would keep running with no feedback to the client.
        if (socket._tokenExp) {
            scheduleTokenExpiry(socket, socket._tokenExp);
        }

        // ── Event handlers ────────────────────────────────────────────────────
        socket.on("search",        safeHandler(socket, "search",        () => matchmakingService.handleSearch(socket)));
        socket.on("offer",         safeHandler(socket, "offer",         (data) => matchmakingService.handleOffer(socket, data)));
        socket.on("answer",        safeHandler(socket, "answer",        (data) => matchmakingService.handleAnswer(socket, data)));
        socket.on("ice-candidate", safeHandler(socket, "ice-candidate", (data) => matchmakingService.handleIceCandidate(socket, data)));
        socket.on("skip",          safeHandler(socket, "skip",          () => matchmakingService.handleSkip(socket)));
        socket.on("stop-search",   safeHandler(socket, "stop-search",   () => matchmakingService.handleStopSearch(socket)));
        socket.on("send-message",  safeHandler(socket, "send-message",  (data) => matchmakingService.handleMessage(socket, data)));

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.userId}`);
            // Always clear timers on disconnect to avoid callbacks
            // firing against a dead socket or polluting the event loop
            clearTokenTimers(socket);
            matchmakingService.handleDisconnect(socket);
        });
    });

    return io;
};