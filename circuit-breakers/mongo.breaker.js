import CircuitBreaker from 'opossum';
import mongoose from 'mongoose';
import { logger } from '../utils/appError.js';

const options = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
};

const mongoQuery = async (model, operation, ...args) => {
  return model[operation](...args);
};

export const createMongoBreaker = (model, operation) => {
  const breaker = new CircuitBreaker(
    (...args) => mongoQuery(model, operation, ...args),
    options
  );

  breaker.on('open', () => 
    logger.warn(`MongoDB ${operation} circuit breaker opened for ${model.modelName}`)
  );
  breaker.on('halfOpen', () => 
    logger.info(`MongoDB ${operation} circuit breaker half-open for ${model.modelName}`)
  );
  breaker.on('close', () => 
    logger.info(`MongoDB ${operation} circuit breaker closed for ${model.modelName}`)
  );

  breaker.fallback(() => {
    throw new Error(`Database operation ${operation} unavailable`);
  });

  return breaker;
};

// Health check breaker
const checkMongoHealth = async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected');
  }
  return true;
};

export const mongoHealthBreaker = new CircuitBreaker(checkMongoHealth, {
  timeout: 2000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
});

mongoHealthBreaker.on('open', () => logger.error('MongoDB health check circuit breaker opened'));
mongoHealthBreaker.fallback(() => false);
