import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import { csrfMiddleware } from "./middlewares/sanitize.middleware.js";
import requestIdMiddleware from "./middlewares/requestId.middleware.js";
import { metricsMiddleware } from "./metrics/middleware.js";
import { register } from "./metrics/prometheus.js";
import { logger } from "./utils/appError.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import matchRoutes from "./routes/match.routes.js";
import reportRoutes from "./routes/report.routes.js";


import AppError from "./utils/appError.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

const app = express();
const API_PREFIX = "/api/v1";

app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(helmet());

app.use(compression());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(csrfMiddleware);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server health status and optionally detailed service status
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: detailed
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include detailed service health checks
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 services:
 *                   type: object
 */
app.get(`${API_PREFIX}/health`, async (req, res) => {
  const health = {
    status: "success",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  };

  if (req.query.detailed === "true") {
    try {
      const mongoose = (await import("mongoose")).default;
      const { getRedis } = await import("./config/redis.js");

      health.services = {
        mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        redis: "unknown",
      };

      try {
        const redis = getRedis();
        await redis.ping();
        health.services.redis = "connected";
      } catch {
        health.services.redis = "disconnected";
      }
    } catch (error) {
      health.services = { error: "Unable to check services" };
    }
  }

  res.status(200).json(health);
});

app.get(`${API_PREFIX}/metrics`, async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

app.use(`${API_PREFIX}/auth`, authRoutes);

app.use(`${API_PREFIX}/users`, userRoutes);

app.use(`${API_PREFIX}/admin`, adminRoutes);

app.use(`${API_PREFIX}/match`, matchRoutes);

app.use(`${API_PREFIX}/report`, reportRoutes);


if (process.env.NODE_ENV !== "production") {
  app.use(
    `${API_PREFIX}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );
}

app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error("Request error", {
    requestId: req.id,
    statusCode,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  });

  const response = {
    status: err.status || "error",
    message:
      process.env.NODE_ENV === "production"
        ? statusCode === 500
          ? "Internal Server Error"
          : err.message
        : err.message,
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

export default app;
