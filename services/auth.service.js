import User from "../models/User.js";
import Otp from "../models/Otp.js";

import {
    generateOtp,
    hashOtp,
    getOtpExpiry,
    compareOtp,
} from "../utils/otp.js";

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../utils/jwt.js";

import EmailService from "./email.service.js";
import AppError from "../utils/appError.js";

class AuthService {
    // register
    static async register(data) {
        const { email, password, registrationNumber, mobileNumber } = data;

        const existingUser = await User.findOne({
            $or: [{ email }, { mobileNumber }, { registrationNumber }],
        });

        if (existingUser) {
            throw new AppError("User already exists", 409);
        }

        const user = await User.create({
            email,
            password,
            registrationNumber,
            mobileNumber,
            isVerified: false,
        });

        const otp = generateOtp();
        const hashedOtp = await hashOtp(otp);

        await Otp.deleteMany({
            user: user._id,
            type: "VERIFY_ACCOUNT",
        });

        await Otp.create({
            user: user._id,
            type: "VERIFY_ACCOUNT",
            hashedOtp,
            expiresAt: getOtpExpiry(),
        });

        await EmailService.sendOtpEmail(email, otp);

        return {
            message: "Registration successful. OTP sent for verification.",
        };
    }

    // verify otp
    static async verifyAccount(identifier, otpInput) {
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobileNumber: identifier }],
        });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isVerified) {
            throw new AppError("Account already verified", 400);
        }

        const otpRecord = await Otp.findOne({
            user: user._id,
            type: "VERIFY_ACCOUNT",
        }).select("+hashedOtp");

        if (!otpRecord) {
            throw new AppError("OTP not found or expired", 400);
        }

        if (otpRecord.expiresAt < new Date()) {
            throw new AppError("OTP expired", 400);
        }

        if (otpRecord.attempts >= 5) {
            throw new AppError("Maximum OTP attempts exceeded", 429);
        }

        const isMatch = await compareOtp(otpInput, otpRecord.hashedOtp);

        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            throw new AppError("Invalid OTP", 400);
        }

        user.isVerified = true;
        await user.save();

        await Otp.deleteOne({ _id: otpRecord._id });

        const payload = {
            userId: user._id,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        user.refreshToken = refreshToken;
        await user.save();

        return {
            message: "Account verified successfully",
            accessToken,
            refreshToken,
        };
    }

    // login
    static async login(identifier, password) {
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobileNumber: identifier }],
        }).select("+password +refreshToken");

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        if (!user.isVerified) {
            throw new AppError("Account not verified", 403);
        }

        if (user.isCurrentlyBanned()) {
            throw new AppError("Account is banned", 403);
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        const payload = {
            userId: user._id,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        user.refreshToken = refreshToken;
        await user.save();

        return {
            accessToken,
            refreshToken,
        };
    }

    // refresh token
    static async refresh(refreshTokenFromCookie) {
        if (!refreshTokenFromCookie) {
            throw new AppError("Refresh token missing", 401);
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshTokenFromCookie);
        } catch (err) {
            throw new AppError("Invalid refresh token", 401);
        }

        const user = await User.findById(decoded.userId).select(
            "+refreshToken",
        );

        if (!user || user.refreshToken !== refreshTokenFromCookie) {
            throw new AppError("Invalid refresh token", 401);
        }

        const payload = {
            userId: user._id,
            role: user.role,
        };

        const newAccessToken = generateAccessToken(payload);

        return {
            accessToken: newAccessToken,
        };
    }

    // logout
    static async logout(userId) {
        const user = await User.findById(userId).select("+refreshToken");

        if (user) {
            user.refreshToken = null;
            await user.save();
        }

        return { message: "Logged out successfully" };
    }
}

export default AuthService;
