import { getRedis } from '../config/redis.js';
import { logger } from '../utils/appError.js';

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
  }

  async get(key) {
    try {
      const redis = getRedis();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const redis = getRedis();
      await redis.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      const redis = getRedis();
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const redis = getRedis();
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error: error.message });
      return false;
    }
  }

  // User profile caching
  getUserKey(userId) {
    return `user:${userId}`;
  }

  async getUserProfile(userId) {
    return this.get(this.getUserKey(userId));
  }

  async setUserProfile(userId, userData, ttl = 1800) {
    return this.set(this.getUserKey(userId), userData, ttl);
  }

  async invalidateUserProfile(userId) {
    return this.del(this.getUserKey(userId));
  }

  // Session caching
  getSessionKey(sessionId) {
    return `session:${sessionId}`;
  }

  async getSession(sessionId) {
    return this.get(this.getSessionKey(sessionId));
  }

  async setSession(sessionId, sessionData, ttl = 900) {
    return this.set(this.getSessionKey(sessionId), sessionData, ttl);
  }

  async invalidateSession(sessionId) {
    return this.del(this.getSessionKey(sessionId));
  }

  // Match session caching
  getMatchSessionKey(sessionId) {
    return `match:session:${sessionId}`;
  }

  getUserActiveMatchKey(userId) {
    return `match:active:${userId}`;
  }

  async getMatchSession(sessionId) {
    return this.get(this.getMatchSessionKey(sessionId));
  }

  async setMatchSession(sessionId, sessionData, ttl = 3600) {
    await this.set(this.getMatchSessionKey(sessionId), sessionData, ttl);
    if (sessionData.userA) {
      await this.set(this.getUserActiveMatchKey(sessionData.userA), sessionId, ttl);
    }
    if (sessionData.userB) {
      await this.set(this.getUserActiveMatchKey(sessionData.userB), sessionId, ttl);
    }
  }

  async invalidateMatchSession(sessionId, userA, userB) {
    await this.del(this.getMatchSessionKey(sessionId));
    if (userA) await this.del(this.getUserActiveMatchKey(userA));
    if (userB) await this.del(this.getUserActiveMatchKey(userB));
  }

  async getUserActiveMatch(userId) {
    const sessionId = await this.get(this.getUserActiveMatchKey(userId));
    if (!sessionId) return null;
    return this.getMatchSession(sessionId);
  }
}

export default new CacheService();
