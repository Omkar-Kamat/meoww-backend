import dotenv from "dotenv";
dotenv.config();

import { validateEnv } from "./utils/validateEnv.js";
validateEnv();

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocketServer } from "./sockets/socket.server.js";
import { connectRedis } from "./config/redis.js";
import { initSocketEventHandlers } from "./events/socketEventHandler.js";
import { startReconnectCleanupWorker, scheduleReconnectCleanup, stopReconnectCleanupWorker } from "./workers/reconnectCleanup.worker.js";
import { startEmailWorker, stopEmailWorker } from "./workers/email.worker.js";
import mongoose from "mongoose";
import { getRedis } from "./config/redis.js";
import { logger } from "./utils/appError.js";
import { GRACEFUL_SHUTDOWN_TIMEOUT_MS } from "./utils/constants.js";

const PORT = process.env.PORT || 5000;

let server;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        await stopReconnectCleanupWorker();
        await stopEmailWorker();

        const redis = getRedis();
        if (redis) {
          await redis.quit();
          logger.info("Redis connection closed");
        }

        await mongoose.connection.close();
        logger.info("MongoDB connection closed");

        logger.info("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", { error: error.message });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server = http.createServer(app);

    await initSocketServer(server);

    initSocketEventHandlers();

    startReconnectCleanupWorker();
    await scheduleReconnectCleanup();

    startEmailWorker();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Server startup failed", { error: error.message });
    process.exit(1);
  }
};

startServer();