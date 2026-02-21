import CircuitBreaker from 'opossum';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/appError.js';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
};

const redisGet = async (key) => {
  const redis = getRedis();
  return redis.get(key);
};

const redisSet = async (key, value, options) => {
  const redis = getRedis();
  if (options?.EX) {
    return redis.setEx(key, options.EX, value);
  }
  return redis.set(key, value, options);
};

const redisDel = async (key) => {
  const redis = getRedis();
  return redis.del(key);
};

export const redisGetBreaker = new CircuitBreaker(redisGet, options);
export const redisSetBreaker = new CircuitBreaker(redisSet, options);
export const redisDelBreaker = new CircuitBreaker(redisDel, options);

// Event handlers
redisGetBreaker.on('open', () => logger.warn('Redis GET circuit breaker opened'));
redisGetBreaker.on('halfOpen', () => logger.info('Redis GET circuit breaker half-open'));
redisGetBreaker.on('close', () => logger.info('Redis GET circuit breaker closed'));

redisSetBreaker.on('open', () => logger.warn('Redis SET circuit breaker opened'));
redisSetBreaker.on('halfOpen', () => logger.info('Redis SET circuit breaker half-open'));
redisSetBreaker.on('close', () => logger.info('Redis SET circuit breaker closed'));

redisDelBreaker.on('open', () => logger.warn('Redis DEL circuit breaker opened'));
redisDelBreaker.on('halfOpen', () => logger.info('Redis DEL circuit breaker half-open'));
redisDelBreaker.on('close', () => logger.info('Redis DEL circuit breaker closed'));

// Fallback handlers
redisGetBreaker.fallback(() => null);
redisSetBreaker.fallback(() => false);
redisDelBreaker.fallback(() => false);
