import MatchSession from "../models/MatchSession.js";
import AppError from "../utils/appError.js";
import { getIO } from "../sockets/socket.server.js";
import { getRedis } from "../config/redis.js";

const SIGNAL_LIMIT = 100; // max signaling events per window
const WINDOW_SECONDS = 10;

class SignalingService {
  static async validateSession(userId, sessionId) {
    const session = await MatchSession.findById(sessionId);

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    if (session.status !== "ACTIVE") {
      throw new AppError("Session not active", 400);
    }

    const isParticipant =
      session.userA.toString() === userId ||
      session.userB.toString() === userId;

    if (!isParticipant) {
      throw new AppError("Unauthorized signaling attempt", 403);
    }

    return session;
  }

  static async rateLimit(userId) {
    const redis = getRedis();
    const key = `signaling:rate:${userId}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (current > SIGNAL_LIMIT) {
      throw new AppError("Signaling rate limit exceeded", 429);
    }
  }

  static async relayOffer(userId, sessionId, offer) {
    await this.rateLimit(userId);

    const session = await this.validateSession(userId, sessionId);

    const partnerId =
      session.userA.toString() === userId
        ? session.userB.toString()
        : session.userA.toString();

    const io = getIO();

    io.to(partnerId).emit("offer", {
      sessionId,
      offer,
    });
  }

  static async relayAnswer(userId, sessionId, answer) {
    await this.rateLimit(userId);

    const session = await this.validateSession(userId, sessionId);

    const partnerId =
      session.userA.toString() === userId
        ? session.userB.toString()
        : session.userA.toString();

    const io = getIO();

    io.to(partnerId).emit("answer", {
      sessionId,
      answer,
    });
  }

  static async relayIceCandidate(userId, sessionId, candidate) {
    await this.rateLimit(userId);

    const session = await this.validateSession(userId, sessionId);

    const partnerId =
      session.userA.toString() === userId
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