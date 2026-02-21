import { getRedis } from "../config/redis.js";

class PresenceService {
    static async incrementConnection(userId) {
        const redis = getRedis();
        const key = `presence:user:${userId}:count`;

        const count = await redis.incr(key);
        await redis.expire(key, 86400);
        await redis.sAdd("presence:online_users", userId);

        return count;
    }

    static async decrementConnection(userId) {
        const redis = getRedis();
        const key = `presence:user:${userId}:count`;

        const count = await redis.decr(key);

        if (count <= 0) {
            await redis.del(key);
            await redis.sRem("presence:online_users", userId);
            return 0;
        }

        return count;
    }

    static async isOnline(userId) {
        const redis = getRedis();
        return await redis.sIsMember(
            "presence:online_users",
            userId
        );
    }
}

export default PresenceService;