import express from 'express';
import * as authController from './auth.controller.js';
import { upload } from '../../config/cloudinary.js';
import { verifyAccessToken } from '../../middleware/auth.middleware.js';
import { 
    authLimiter, 
    refreshLimiter,   
    resendOtpLimiter, 
    turnLimiter, 
    signupLimiter 
} from '../../middleware/rateLimit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { signupSchema, loginSchema, verifySchema, resendOtpSchema } from './auth.schema.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               profilePhoto: { type: string, format: binary }
 *     responses:
 *       201: { description: Signup successful }
 *       400: { description: User already exists or validation error }
 */
router.post(
  "/signup",
  signupLimiter,
  upload.single("profilePhoto"),   
  validate(signupSchema),         
  authController.signup
);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified }
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200: { description: Verification successful }
 *       400: { description: Invalid or expired OTP }
 */
router.post('/verify', validate(verifySchema), authController.verify);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: OTP resent successfully }
 *       400: { description: User not found }
 *       429: { description: Too many requests }
 */
router.post('/resend-otp', resendOtpLimiter, validate(resendOtpSchema), authController.resendOtp);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh tokens
 *     tags: [Auth]
 *     responses:
 *       200: { description: Tokens refreshed }
 *       401: { description: Invalid refresh token }
 *       429: { description: Too many refresh attempts }
 */
router.post('/refresh', refreshLimiter, authController.refresh);   // ← changed to refreshLimiter

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: User profile retrieved }
 *       404: { description: User not found }
 */
router.get('/me', verifyAccessToken, authController.getMe);

/**
 * @swagger
 * /api/auth/turn-credentials:
 *   get:
 *     summary: Get ephemeral TURN credentials
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: TURN credentials retrieved }
 */
router.get('/turn-credentials', verifyAccessToken, turnLimiter, authController.getTurnCredentials);

export default router;