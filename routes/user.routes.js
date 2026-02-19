import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import UserController from "../controllers/user.controller.js";

const router = express.Router();

router.get("/profile", authMiddleware, UserController.getProfile);

export default router;
