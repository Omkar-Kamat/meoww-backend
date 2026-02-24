import { Server } from "socket.io";
import { authenticateSocket } from "./socket.auth.js";
import MatchmakingService from "./matchmaking.service.js";

export const initSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  const matchmaking = new MatchmakingService(io);

  io.on("connection", (socket) => {
    socket.on("search", () => {
      matchmaking.tryMatch(socket);
    });

    socket.on("skip", () => {
      matchmaking.handleSkip(socket);
    });

    socket.on("disconnect", () => {
      matchmaking.handleDisconnect(socket);
    });

    socket.on("offer", (offer) => {
      const roomId = matchmaking.userToRoom.get(
        socket.user._id.toString()
      );

      if (roomId) {
        socket.to(roomId).emit("offer", offer);
      }
    });

    socket.on("answer", (answer) => {
      const roomId = matchmaking.userToRoom.get(
        socket.user._id.toString()
      );

      if (roomId) {
        socket.to(roomId).emit("answer", answer);
      }
    });

    socket.on("ice-candidate", (candidate) => {
      const roomId = matchmaking.userToRoom.get(
        socket.user._id.toString()
      );

      if (roomId) {
        socket.to(roomId).emit("ice-candidate", candidate);
      }
    });
  });

  return io;
};