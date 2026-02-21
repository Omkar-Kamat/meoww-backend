import MatchSessionRepository from "../repositories/matchSession.repository.js";
import ReconnectService from "../services/reconnect.service.js";
import { getIO } from "../sockets/socket.server.js";
import { getRedis } from "../config/redis.js";
import { logger } from "../utils/appError.js";
import { RECONNECT_CLEANUP_INTERVAL_MS } from "../utils/constants.js";

const CLEANUP_INTERVAL = RECONNECT_CLEANUP_INTERVAL_MS;
const LOCK_KEY = "lock:reconnect:cleanup";
const LOCK_TTL = 10;

const acquireLock = async () => {
    try {
        const redis = getRedis();
        const lockId = `${process.pid}-${Date.now()}`;
        const acquired = await redis.set(LOCK_KEY, lockId, {
            NX: true,
            EX: LOCK_TTL,
        });
        return acquired ? lockId : null;
    } catch (error) {
        logger.error("Lock acquisition failed", { error: error.message });
        return null;
    }
};

const releaseLock = async (lockId) => {
    try {
        const redis = getRedis();
        const currentLock = await redis.get(LOCK_KEY);
        if (currentLock === lockId) {
            await redis.del(LOCK_KEY);
        }
    } catch (error) {
        logger.error("Lock release failed", { error: error.message });
    }
};

export const startReconnectCleanupJob = () => {
    const interval = setInterval(async () => {
        const lockId = await acquireLock();
        
        if (!lockId) {
            return;
        }

        try {
            const sessions = await MatchSessionRepository.find({
                status: "ACTIVE",
            });

            for (const session of sessions) {
                const users = [
                    session.userA.toString(),
                    session.userB.toString(),
                ];

                for (const userId of users) {
                    const stillInGrace =
                        await ReconnectService.hasReconnectWindow(
                            session._id.toString(),
                            userId
                        );

                    if (stillInGrace) continue;

                    const wasMarked =
                        await ReconnectService.wasEverMarked(
                            session._id.toString(),
                            userId
                        );

                    if (!wasMarked) continue;


                    await MatchSessionRepository.save(session);

                    const partnerId =
                        session.userA.toString() === userId
                            ? session.userB.toString()
                            : session.userA.toString();

                    const io = getIO();

                    io.to(partnerId).emit("matchEnded", {
                        sessionId: session._id,
                    });

                    break;
                }
            }
        } catch (err) {
            logger.error("Reconnect cleanup job error", { error: err.message });
        } finally {
            await releaseLock(lockId);
        }
    }, CLEANUP_INTERVAL);

    return interval;
};