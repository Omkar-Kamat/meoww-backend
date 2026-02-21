import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/auth.middleware.js";
import UserController from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateProfileSchema } from "../validations/user.schema.js";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_USER_MAX } from "../utils/constants.js";


const router = express.Router();

const userLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_USER_MAX,
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieves the authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     _id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     registrationNumber:
 *                       type: string
 *                     mobileNumber:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     isBanned:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Account is banned
 */
router.get("/profile", authMiddleware, userLimiter, UserController.getProfile);

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Updates the authenticated user's profile information (fullName, mobileNumber)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               mobileNumber:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */
router.patch("/profile", authMiddleware, userLimiter, validate(updateProfileSchema), UserController.updateProfile);

export default router;