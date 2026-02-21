import MatchSession from "../models/MatchSession.js";
import AppError from "../utils/appError.js";
import { getIO } from "../sockets/socket.server.js";

class SignalingService {
  static async relayOffer(fromUserId, sessionId, offer) {
    const session = await MatchSession.findById(sessionId);

    if (!session || session.status !== "ACTIVE") {
      throw new AppError("Invalid session", 400);
    }

    const partnerId =
      session.userA.toString() === fromUserId
        ? session.userB.toString()
        : session.userA.toString();

    const io = getIO();

    io.to(partnerId).emit("offer", {
      sessionId,
      offer,
    });
  }

  static async relayAnswer(fromUserId, sessionId, answer) {
    const session = await MatchSession.findById(sessionId);

    if (!session || session.status !== "ACTIVE") {
      throw new AppError("Invalid session", 400);
    }

    const partnerId =
      session.userA.toString() === fromUserId
        ? session.userB.toString()
        : session.userA.toString();

    const io = getIO();

    io.to(partnerId).emit("answer", {
      sessionId,
      answer,
    });
  }

  static async relayIceCandidate(fromUserId, sessionId, candidate) {
    const session = await MatchSession.findById(sessionId);

    if (!session || session.status !== "ACTIVE") {
      throw new AppError("Invalid session", 400);
    }

    const partnerId =
      session.userA.toString() === fromUserId
        ? session.userB.toString()
        : session.userA.toString();

    const io = getIO();

    io.to(partnerId).emit("ice-candidate", {
      sessionId,
      candidate,
    });
  }
}

export default SignalingService;