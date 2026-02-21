import { Queue } from "bullmq";
import { logger } from "../utils/appError.js";

let emailQueue;

export const getEmailQueue = () => {
  if (!emailQueue) {
    emailQueue = new Queue("email", {
      connection: {
        host: process.env.REDIS_URL?.split("://")[1]?.split(":")[0] || "localhost",
        port: parseInt(process.env.REDIS_URL?.split(":")[2]) || 6379,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    });

    logger.info("Email queue initialized");
  }

  return emailQueue;
};
