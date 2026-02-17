import express from "express";
import helmet from "helmet";

const app = express();
const API_PREFIX = "/api/v1";

app.use(helmet());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

export default app;
