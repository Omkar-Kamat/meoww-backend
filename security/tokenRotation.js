import { getRedis } from '../config/redis.js';
import crypto from 'crypto';

class TokenRotationService {
  static generateTokenFamily() {
    return crypto.randomBytes(16).toString('hex');
  }

  static async storeRefreshToken(userId, token, family, expiresIn = 604800) {
    const redis = getRedis();
    const key = `refresh:${userId}:${family}`;
    await redis.setEx(key, expiresIn, token);
  }

  static async validateTokenFamily(userId, token, family) {
    const redis = getRedis();
    const key = `refresh:${userId}:${family}`;
    const storedToken = await redis.get(key);
    
    if (!storedToken) return { valid: false, reused: true };
    if (storedToken !== token) {
      await this.revokeTokenFamily(userId, family);
      return { valid: false, reused: true };
    }
    
    return { valid: true, reused: false };
  }

  static async rotateRefreshToken(userId, oldFamily) {
    const redis = getRedis();
    await redis.del(`refresh:${userId}:${oldFamily}`);
    return this.generateTokenFamily();
  }

  static async revokeTokenFamily(userId, family) {
    const redis = getRedis();
    await redis.del(`refresh:${userId}:${family}`);
    await redis.setEx(`revoked:${userId}:${family}`, 604800, '1');
  }

  static async isTokenFamilyRevoked(userId, family) {
    const redis = getRedis();
    return await redis.exists(`revoked:${userId}:${family}`);
  }

  static async revokeAllUserTokens(userId) {
    const redis = getRedis();
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export default TokenRotationService;
