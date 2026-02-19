import express from "express";
import AuthController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    registerSchema,
    verifySchema,
    loginSchema,
    resendOtpSchema,
} from "../validations/auth.schema.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - registrationNumber
 *               - mobileNumber
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: OTP sent for verification
 */
router.post("/register", validate(registerSchema), AuthController.register);

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify account using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - otp
 *             properties:
 *               identifier:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account verified and tokens issued
 */
router.post("/verify", validate(verifySchema), AuthController.verifyAccount);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns access token
 */
router.post("/login", validate(loginSchema), AuthController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
router.post("/logout", AuthController.logout);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Resend account verification OTP
 *     description: Resends a verification OTP to the user's registered email if the account is not yet verified.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@lpu.in
 *     responses:
 *       200:
 *         description: OTP resent successfully
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
 *                   example: OTP resent successfully
 *       400:
 *         description: Account already verified
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

router.post("/resend-otp", validate(resendOtpSchema), AuthController.resendOtp);


export default router;
