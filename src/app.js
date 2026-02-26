import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import corsOptions from "./config/cors.js";
import authRoutes from "./modules/auth/auth.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

const app = express();
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}
// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);

// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Error Handler
app.use((err, req, res, next) => {
    if (err.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    if (err.message === "Only image files allowed") {
        return res
            .status(400)
            .json({
                error: "Only image files are allowed (jpg, jpeg, png, webp).",
            });
    }

    const statusCode = err.statusCode || err.status || 500;

    if (process.env.NODE_ENV !== "production") {
        console.error(err);
    }

    const isProd = process.env.NODE_ENV === "production";

    res.status(statusCode).json({
        error:
            isProd && statusCode === 500
                ? "Internal Server Error"
                : err.message,
    });
});

export default app;
