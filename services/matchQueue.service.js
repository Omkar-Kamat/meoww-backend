import { getRedis } from "../config/redis.js";

const QUEUE_KEY = "matchmaking:queue";

const POP_TWO_SCRIPT = `
  local users = redis.call('ZPOPMIN', KEYS[1], 2)
  if #users < 4 then
    if #users == 2 then
      redis.call('ZADD', KEYS[1], users[2], users[1])
    end
    return nil
  end
  return {users[1], users[3]}
`;

class MatchQueue {
  static async add(userId) {
    const redis = getRedis();
    await redis.zAdd(QUEUE_KEY, {
      score: Date.now(),
      value: userId,
    });
    await redis.expire(QUEUE_KEY, 3600);
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
    const result = await redis.eval(POP_TWO_SCRIPT, {
      keys: [QUEUE_KEY],
    });
    return result;
  }
}

export default MatchQueue;