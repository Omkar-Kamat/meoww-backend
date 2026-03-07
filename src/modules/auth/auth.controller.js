import jwt from "jsonwebtoken";
import axios from "axios";
import * as authService from "./auth.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { AppError } from "../../utils/AppError.js";

const isProd = process.env.NODE_ENV === "production";
const isCrossSite = process.env.CROSS_SITE === "true";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    path: "/",
    sameSite: isProd ? (isCrossSite ? "none" : "strict") : "lax",
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: COOKIE_OPTIONS.secure,
    path: "/",
    sameSite: COOKIE_OPTIONS.sameSite,
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie("access_token", accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

// ─── Existing controllers ─────────────────────────────────────────────────────

export const signup = async (req, res, next) => {
    try {
        const { name, username, email, password } = req.body;
        let profileImage = "";
        if (req.file) {
            profileImage = await uploadToCloudinary(req.file.buffer);
        }
        const user = await authService.signup(name, username, email, password, profileImage);
        res.status(201).json({
            message: "Signup successful. Please verify your email.",
            userId: user._id,
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.login(email, password);
        setAuthCookies(res, accessToken, refreshToken);
        res.json({ user });
    } catch (err) {
        next(err);
    }
};

export const verify = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;
        const { user, accessToken, refreshToken } = await authService.verify(userId, otp);
        setAuthCookies(res, accessToken, refreshToken);
        res.json({ user });
    } catch (err) {
        next(err);
    }
};

export const resendOtp = async (req, res, next) => {
    try {
        const { userId } = req.body;
        await authService.resendOtp(userId);
        res.json({ message: "OTP resent successfully. Please check your email." });
    } catch (err) {
        next(err);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const oldRefreshToken = req.cookies.refresh_token;
        if (!oldRefreshToken) {
            return next(AppError.unauthorized("No refresh token provided"));
        }
        const { accessToken, refreshToken: newRefreshToken } =
            await authService.refresh(oldRefreshToken);
        setAuthCookies(res, accessToken, newRefreshToken);
        res.json({ message: "Token refreshed" });
    } catch (err) {
        next(err);
    }
};

export const logout = async (req, res, next) => {
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            if (decoded?.userId) {
                await authService.logout(decoded.userId);
            }
        } catch {
            // Invalid/expired token — still clear cookies
        }
    }
    res.clearCookie("access_token", CLEAR_COOKIE_OPTIONS);
    res.clearCookie("refresh_token", CLEAR_COOKIE_OPTIONS);
    res.json({ message: "Logged out successfully" });
};

export const getMe = async (req, res, next) => {
    try {
        const user = await authService.getUserProfile(req.user.userId);
        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const getTurnCredentials = async (req, res, next) => {
    try {
        const response = await axios.get(
            `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials`,
            {
                params: { apiKey: process.env.METERED_API_KEY },
                timeout: 5000,
            }
        );
        res.json({ iceServers: response.data });
    } catch {
        next(AppError.internal("Failed to fetch TURN credentials"));
    }
};

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 *
 * Always responds with 200 and the same message, whether or not the email
 * exists. This prevents user enumeration attacks.
 */
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        // Service silently no-ops if email not found — never throws for missing user
        await authService.forgotPassword(email);
        res.json({
            message: "If an account with that email exists, a reset link has been sent.",
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and sets the new password.
 * On success, all existing sessions are invalidated — the user must log in again.
 */
export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        await authService.resetPassword(token, password);

        // Clear any cookies in case the user making the request is logged in
        // (e.g. they reset from the same browser they're logged in with)
        res.clearCookie("access_token", CLEAR_COOKIE_OPTIONS);
        res.clearCookie("refresh_token", CLEAR_COOKIE_OPTIONS);

        res.json({
            message: "Password reset successful. Please log in with your new password.",
        });
    } catch (err) {
        next(err);
    }
};