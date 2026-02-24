import express from "express";
import {
  signup,
  login,
  getMe,
  refresh,
  logout
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);

export default router;