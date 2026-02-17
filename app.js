import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

const app = express();
const API_PREFIX = "/api/v1";

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

export default app;
