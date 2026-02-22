import { getRedis } from "../config/redis.js";
import { RECONNECT_GRACE_PERIOD_SECONDS } from "../utils/constants.js";

const RECONNECT_TTL = RECONNECT_GRACE_PERIOD_SECONDS;

class ReconnectService {
    static async markDisconnected(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:session:${sessionId}:${userId}`;
        const markedKey = `reconnect:marked:${sessionId}:${userId}`;
        await redis.setEx(key, RECONNECT_TTL, "1");
        await redis.setEx(markedKey, RECONNECT_TTL + 5, "1");
    }

    static async clearReconnect(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:session:${sessionId}:${userId}`;
        const markedKey = `reconnect:marked:${sessionId}:${userId}`;
        await redis.del(key);
        await redis.del(markedKey);
    }

    static async hasReconnectWindow(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:session:${sessionId}:${userId}`;
        return await redis.exists(key);
    }

    static async wasEverMarked(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:marked:${sessionId}:${userId}`;
        return await redis.exists(key);
    }
}

export default ReconnectService;