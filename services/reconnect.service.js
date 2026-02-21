import { getRedis } from "../config/redis.js";

const RECONNECT_TTL = 15; // seconds

class ReconnectService {
    static async markDisconnected(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:session:${sessionId}:${userId}`;
        await redis.set(key, "1", {
            EX: RECONNECT_TTL,
        });
    }

    static async clearReconnect(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:session:${sessionId}:${userId}`;
        await redis.del(key);
    }

    static async hasReconnectWindow(sessionId, userId) {
        const redis = getRedis();
        const key = `reconnect:session:${sessionId}:${userId}`;
        return await redis.exists(key);
    }
}

export default ReconnectService;