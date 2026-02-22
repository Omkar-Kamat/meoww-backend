import { getRedis } from "../config/redis.js";

const QUEUE_KEY = "matchmaking:queue";

class MatchQueue {
  static async add(userId) {
    const redis = getRedis();
    await redis.zAdd(QUEUE_KEY, { score: Date.now(), value: String(userId) });
    await redis.expire(QUEUE_KEY, 3600);
  }

  static async remove(userId) {
    const redis = getRedis();
    await redis.zRem(QUEUE_KEY, String(userId));
  }

  static async size() {
    const redis = getRedis();
    return await redis.zCard(QUEUE_KEY);
  }

  static async popTwo() {
    const redis = getRedis();
    const result = await redis.zPopMin(QUEUE_KEY, 2);
    
    if (!result || result.length === 0) {
      return null;
    }
    
    if (result.length === 1) {
      await redis.zAdd(QUEUE_KEY, result);
      return null;
    }
    
    if (!result[0] || !result[1]) {
      return null;
    }
    
    return [result[0].value, result[1].value];
  }
}

export default MatchQueue;