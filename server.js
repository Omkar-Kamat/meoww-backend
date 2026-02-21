import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocketServer } from "./sockets/socket.server.js";
import { connectRedis } from "./config/redis.js";
import { startReconnectCleanupJob } from "./jobs/reconnectCleanup.job.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    const server = http.createServer(app);

    await initSocketServer(server);

    startReconnectCleanupJob();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();