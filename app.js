import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";

const app = express();
const API_PREFIX = "/api/v1";

app.use(helmet());

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    }),
);

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.get(`${API_PREFIX}/health`, (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Server is running",
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.statusCode || 500).json({
        status: "error",
        message:
            process.env.NODE_ENV === "production"
                ? "Internal Server Error"
                : err.message,
    });
});

//routes
app.use("/api/v1/auth", authRoutes);

export default app;
