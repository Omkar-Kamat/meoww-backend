import MatchSessionRepository from "../repositories/matchSession.repository.js";
import AppError from "../utils/appError.js";
import eventBus from "../events/eventBus.js";
import { getRedis } from "../config/redis.js";
import { SIGNALING_RATE_LIMIT, SIGNALING_WINDOW_SECONDS, ICE_CANDIDATE_BUFFER_TTL_SECONDS } from "../utils/constants.js";

const SIGNAL_LIMIT = SIGNALING_RATE_LIMIT;
const WINDOW_SECONDS = SIGNALING_WINDOW_SECONDS;
const CANDIDATE_BUFFER_TTL = ICE_CANDIDATE_BUFFER_TTL_SECONDS;

class SignalingService {
  static async validateSession(userId, sessionId) {
    const session = await MatchSessionRepository.findById(sessionId);

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

  static async bufferIceCandidate(sessionId, userId, candidate) {
    const redis = getRedis();
    const key = `ice:buffer:${sessionId}:${userId}`;
    await redis.rPush(key, JSON.stringify(candidate));
    await redis.expire(key, CANDIDATE_BUFFER_TTL);
  }

  static async flushIceCandidates(sessionId, userId, partnerId) {
    const redis = getRedis();
    const key = `ice:buffer:${sessionId}:${userId}`;
    const candidates = await redis.lRange(key, 0, -1);
    
    if (candidates.length > 0) {
      for (const candidate of candidates) {
        eventBus.emitIceCandidate(sessionId, userId, partnerId, JSON.parse(candidate));
      }
      await redis.del(key);
    }
  }

  static async relayOffer(userId, sessionId, offer) {
    await this.rateLimit(userId);

    const session = await this.validateSession(userId, sessionId);

    const partnerId =
      session.userA.toString() === userId
        ? session.userB.toString()
        : session.userA.toString();

    const redis = getRedis();
    const offerKey = `signaling:offer:${sessionId}:${userId}`;
    await redis.set(offerKey, "1", { EX: 300 });

    eventBus.emitOffer(sessionId, userId, partnerId, offer);

    await this.flushIceCandidates(sessionId, userId, partnerId);
  }

  static async relayAnswer(userId, sessionId, answer) {
    await this.rateLimit(userId);

    const session = await this.validateSession(userId, sessionId);

    const partnerId =
      session.userA.toString() === userId
        ? session.userB.toString()
        : session.userA.toString();

    const redis = getRedis();
    const answerKey = `signaling:answer:${sessionId}:${userId}`;
    await redis.set(answerKey, "1", { EX: 300 });

    eventBus.emitAnswer(sessionId, userId, partnerId, answer);

    await this.flushIceCandidates(sessionId, userId, partnerId);
  }

  static async relayIceCandidate(userId, sessionId, candidate) {
    await this.rateLimit(userId);

    const session = await this.validateSession(userId, sessionId);

    const partnerId =
      session.userA.toString() === userId
        ? session.userB.toString()
        : session.userA.toString();

    const redis = getRedis();
    const offerKey = `signaling:offer:${sessionId}:${partnerId}`;
    const hasOffer = await redis.exists(offerKey);

    if (!hasOffer) {
      await this.bufferIceCandidate(sessionId, userId, candidate);
      return;
    }

    eventBus.emitIceCandidate(sessionId, userId, partnerId, candidate);
  }
}

export default SignalingService;