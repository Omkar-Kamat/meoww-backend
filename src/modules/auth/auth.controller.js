import jwt from "jsonwebtoken";
import axios from "axios";
import * as authService from "./auth.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

const isProd = process.env.NODE_ENV === "production";
const isCrossSite = process.env.CROSS_SITE === "true";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd
        ? isCrossSite
            ? "none"
            : "strict"
        : "lax",
};
export const signup = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    let profileImage = "";

    if (req.file) {
      profileImage = await uploadToCloudinary(req.file.buffer);
    }

    const user = await authService.signup(
      name,
      username,
      email,
      password,
      profileImage
    );

    res.status(201).json({
      message: "Signup successful. Please verify your email.",
      userId: user._id,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.login(
            email,
            password,
        );
        res.cookie("access_token", accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000,
        });
        res.cookie("refresh_token", refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user });
    } catch (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
            return res.status(403).json({
                error: error.message,
                code: error.code,
                userId: error.userId,
            });
        }
        res.status(401).json({ error: error.message });
    }
};
export const verify = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const { user, accessToken, refreshToken } = await authService.verify(
            userId,
            otp,
        );
        res.cookie("access_token", accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000,
        });
        res.cookie("refresh_token", refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        await authService.resendOtp(userId);
        res.json({
            message: "OTP resent successfully. Please check your email.",
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const refresh = async (req, res) => {
    try {
        const oldRefreshToken = req.cookies.refresh_token;
        if (!oldRefreshToken) throw new Error("No refresh token provided");
        const { accessToken, refreshToken: newRefreshToken } =
            await authService.refresh(oldRefreshToken);
        res.cookie("access_token", accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000,
        });
        res.cookie("refresh_token", newRefreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ message: "Token refreshed" });
    } catch (error) {
        res.status(401).json({ error: "Session expired. Please login again." });
    }
};

export const logout = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
        try {
            const decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET
            );

            if (decoded?.userId) {
                await authService.logout(decoded.userId);
            }
        } catch (err) {

        }
    }

    res.clearCookie("access_token", {
        httpOnly: true,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
    });
    res.clearCookie("refresh_token", {
        httpOnly: true,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
    });
    res.json({ message: "Logged out successfully" });
};

export const getMe = async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.userId);
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: "User not found" });
    }
};
export const getTurnCredentials = async (req, res) => {
  try {
    const response = await axios.get(
      `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials`,
      {
        params: {
          apiKey: process.env.METERED_API_KEY
        }
      }
    );

    res.json({ iceServers: response.data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch TURN credentials" });
  }
};