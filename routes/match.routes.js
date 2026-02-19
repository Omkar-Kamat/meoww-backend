import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import MatchController from "../controllers/match.controller.js";

const router = express.Router();

router.post("/start", authMiddleware, MatchController.start);

router.post("/skip", authMiddleware, MatchController.skip);

router.post("/end", authMiddleware, MatchController.end);


export default router;
