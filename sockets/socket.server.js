import { Server } from "socket.io";
import cookie from "cookie";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";

let io;

export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

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

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user.id);

    socket.join(socket.user.id);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.user.id);
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
