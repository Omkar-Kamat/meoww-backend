import express from "express";

const app = express();

const API_PREFIX = "/api/v1";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

export default app;
