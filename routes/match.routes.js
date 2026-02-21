import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/auth.middleware.js";
import MatchController from "../controllers/match.controller.js";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MATCH_MAX } from "../utils/constants.js";

const router = express.Router();

const matchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: RATE_LIMIT_MATCH_MAX,
    message: "Too many match requests, please slow down",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Match
 *   description: Video chat matching and session management
 */

/**
 * @swagger
 * /match/ice-servers:
 *   get:
 *     summary: Get ICE servers for WebRTC
 *     description: Returns STUN/TURN server configuration for establishing peer connections
 *     tags: [Match]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: ICE servers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     iceServers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           urls:
 *                             type: string
 *                           username:
 *                             type: string
 *                           credential:
 *                             type: string
 *       401:
 *         description: Not authenticated
 */
router.get("/ice-servers", authMiddleware, MatchController.getIceServers);

/**
 * @swagger
 * /match/start:
 *   post:
 *     summary: Start or join matchmaking queue
 *     description: Adds user to matchmaking queue and returns match when found
 *     tags: [Match]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Match status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: boolean
 *                     matched:
 *                       type: boolean
 *                     alreadyMatched:
 *                       type: boolean
 *                     sessionId:
 *                       type: string
 *                     partnerId:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Account is banned
 *       429:
 *         description: Too many requests
 */
router.post("/start", authMiddleware, matchLimiter, MatchController.start);

/**
 * @swagger
 * /match/skip:
 *   post:
 *     summary: Skip current match and find new partner
 *     description: Ends current session and immediately starts searching for a new match
 *     tags: [Match]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Skipped and new match status returned
 *       400:
 *         description: No active session to skip
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Too many requests
 */
router.post("/skip", authMiddleware, matchLimiter, MatchController.skip);

/**
 * @swagger
 * /match/end:
 *   post:
 *     summary: End current match session
 *     description: Terminates the active match session and notifies partner
 *     tags: [Match]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Match ended successfully
 *       400:
 *         description: No active session to end
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Too many requests
 */
router.post("/end", authMiddleware, matchLimiter, MatchController.end);


export default router;
