import MatchSessionRepository from "../repositories/matchSession.repository.js";
import UserRepository from "../repositories/user.repository.js";
import matchQueue from "./matchQueue.service.js";
import AppError from "../utils/appError.js";
import eventBus from "../events/eventBus.js";
import { getRedis } from "../config/redis.js";
import cacheService from "../cache/cache.service.js";

class MatchService {
    static async start(userId) {
        const redis = getRedis();
        const lockKey = `match:lock:${userId}`;
        const acquired = await redis.set(lockKey, "1", { NX: true, EX: 5 });
        
        if (!acquired) {
            throw new AppError("Match request in progress", 429);
        }

        try {
            const cachedMatch = await cacheService.getUserActiveMatch(userId);
            if (cachedMatch) {
                return {
                    alreadyMatched: true,
                    sessionId: cachedMatch._id || cachedMatch.id,
                };
            }

            const existingSession = await MatchSessionRepository.findOne({
                $or: [{ userA: userId }, { userB: userId }],
                status: "ACTIVE",
            });

            if (existingSession) {
                await cacheService.setMatchSession(existingSession._id.toString(), existingSession);
                return {
                    alreadyMatched: true,
                    sessionId: existingSession._id,
                };
            }

            const user = await UserRepository.findById(userId);

            if (!user) {
                throw new AppError("User not found", 404);
            }

            if (user.isCurrentlyBanned()) {
                throw new AppError("Account is banned", 403);
            }

            await matchQueue.add(userId);

            const users = await matchQueue.popTwo();

            if (!users) {
                return {
                    waiting: true,
                };
            }

            const [userA, userB] = users;

            if (userA === userB) {
                await matchQueue.add(userA);
                return { waiting: true };
            }

            const session = await MatchSessionRepository.create({
                userA,
                userB,
            });

            await cacheService.setMatchSession(session._id.toString(), {
                _id: session._id,
                userA,
                userB,
                status: 'ACTIVE',
            });
            eventBus.emitMatchFound(userA, userB, session._id);

            return {
                matched: true,
                sessionId: session._id,
                partnerId: userId === userA ? userB : userA,
            };
        } finally {
            await redis.del(lockKey);
        }
    }

    // skip
    static async skip(userId) {
        const redis = getRedis();
        const lockKey = `match:lock:${userId}`;
        const acquired = await redis.set(lockKey, "1", { NX: true, EX: 5 });
        
        if (!acquired) {
            throw new AppError("Match request in progress", 429);
        }

        try {
            const session = await MatchSessionRepository.findOne({
                $or: [{ userA: userId }, { userB: userId }],
                status: "ACTIVE",
            });

            if (!session) {
                throw new AppError("No active session to skip", 400);
            }

            await MatchSessionRepository.save(session);
            await cacheService.invalidateMatchSession(
                session._id.toString(),
                session.userA.toString(),
                session.userB.toString()
            );

            const partnerId =
                session.userA.toString() === userId
                    ? session.userB.toString()
                    : session.userA.toString();

            eventBus.emitMatchSkipped(session._id, userId, partnerId);

            await matchQueue.remove(userId);

            return await this.start(userId);
        } finally {
            await redis.del(lockKey);
        }
    }

    // end
    static async end(userId) {
        const session = await MatchSessionRepository.findOne({
            $or: [{ userA: userId }, { userB: userId }],
            status: "ACTIVE",
        });

        if (!session) {
            throw new AppError("No active session to end", 400);
        }


        await MatchSessionRepository.save(session);
        await cacheService.invalidateMatchSession(
            session._id.toString(),
            session.userA.toString(),
            session.userB.toString()
        );

        const partnerId =
            session.userA.toString() === userId
                ? session.userB.toString()
                : session.userA.toString();

        eventBus.emitMatchEnded(session._id, userId, partnerId);

        await matchQueue.remove(userId);

        return {
            message: "Match ended successfully",
        };
    }
}

export default MatchService;
