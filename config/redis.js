import { createClient } from "redis";

import { logger } from "../utils/appError.js";

let redisClient;

export const connectRedis = async (retries = 5) => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error("Max retries reached");
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on("error", (err) =>
      logger.error("Redis Error", { error: err.message })
    );

    await redisClient.connect();

    logger.info("Redis connected");
  } catch (error) {
    logger.error("Redis connection failed", { error: error.message });
    
    if (retries > 0) {
      logger.info(`Retrying Redis connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectRedis(retries - 1);
    }
    
    throw error;
  }
};

export const getRedis = () => {
  if (!redisClient) {
    throw new Error("Redis not initialized");
  }
  return redisClient;
};