import { getRedis } from "../config/redis.js";

const QUEUE_KEY = "matchmaking:queue";

class MatchQueue {
  static async add(userId) {
    const redis = getRedis();
    await redis.zAdd(QUEUE_KEY, {
      score: Date.now(),
      value: userId,
    });
  }

  static async remove(userId) {
    const redis = getRedis();
    await redis.zRem(QUEUE_KEY, userId);
  }

  static async size() {
    const redis = getRedis();
    return await redis.zCard(QUEUE_KEY);
  }

  static async popTwo() {
    const redis = getRedis();

    const users = await redis.zPopMin(QUEUE_KEY, 2);

    if (!users || users.length < 2) {
      if (users && users.length === 1) {
        await redis.zAdd(QUEUE_KEY, users[0]);
      }
      return null;
    }

    return [users[0].value, users[1].value];
  }
}

export default MatchQueue;