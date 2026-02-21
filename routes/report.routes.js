import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/auth.middleware.js";
import ReportController from "../controllers/report.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { reportSchema } from "../validations/user.schema.js";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_REPORT_MAX } from "../utils/constants.js";

const router = express.Router();

const reportLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_REPORT_MAX,
    message: "Too many reports, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: User reporting system for inappropriate behavior
 */

/**
 * @swagger
 * /report:
 *   post:
 *     summary: Report a user
 *     description: Submit a report against another user in an active session. Auto-bans user after threshold violations.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - reason
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID of the active match session
 *               reason:
 *                 type: string
 *                 description: Reason for reporting the user
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 autoBanned:
 *                   type: boolean
 *                   description: Whether the reported user was automatically banned
 *       400:
 *         description: Invalid session or duplicate report
 *       401:
 *         description: Not authenticated
 */
router.post(
  "/",
  authMiddleware,
  reportLimiter,
  validate(reportSchema),
  ReportController.create
);

export default router;