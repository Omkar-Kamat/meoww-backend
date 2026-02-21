import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import ReportController from "../controllers/report.controller.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  ReportController.create
);

export default router;