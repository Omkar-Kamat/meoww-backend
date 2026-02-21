import { createClient } from "redis";

let redisClient;

export const connectRedis = async () => {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on("error", (err) =>
    console.error("Redis Error:", err)
  );

  await redisClient.connect();

  console.log("Redis connected");
  console.log("REDIS_URL:", process.env.REDIS_URL);
};

export const getRedis = () => {
  if (!redisClient) {
    throw new Error("Redis not initialized");
  }
  return redisClient;
};