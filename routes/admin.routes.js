import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import AdminController from "../controllers/admin.controller.js";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_ADMIN_MAX } from "../utils/constants.js";

const router = express.Router();

const adminLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_ADMIN_MAX,
    message: "Too many admin requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations for user management
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieves a list of all registered users with pagination support
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 */
router.get("/users", authMiddleware, roleMiddleware("ADMIN"), adminLimiter, AdminController.getUsers);

/**
 * @swagger
 * /admin/ban/{id}:
 *   patch:
 *     summary: Ban a user (Admin only)
 *     description: Bans a user for a specified duration or permanently
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to ban
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: number
 *                 description: Ban duration in hours (omit for permanent ban)
 *               reason:
 *                 type: string
 *                 description: Reason for ban
 *     responses:
 *       200:
 *         description: User banned successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *       404:
 *         description: User not found
 */
router.patch("/ban/:id", authMiddleware, roleMiddleware("ADMIN"), adminLimiter, AdminController.banUser);

/**
 * @swagger
 * /admin/unban/{id}:
 *   patch:
 *     summary: Unban a user (Admin only)
 *     description: Removes ban from a user account
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unban
 *     responses:
 *       200:
 *         description: User unbanned successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (Admin only)
 *       404:
 *         description: User not found
 */
router.patch("/unban/:id", authMiddleware, roleMiddleware("ADMIN"), adminLimiter, AdminController.unbanUser);



export default router;
