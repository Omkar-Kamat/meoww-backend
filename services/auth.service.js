import UserRepository from "../repositories/user.repository.js";
import OtpRepository from "../repositories/otp.repository.js";
import mongoose from "mongoose";
import { OTP_MAX_ATTEMPTS } from "../utils/constants.js";
import TokenRotationService from "../security/tokenRotation.js";

import {
    generateOtp,
    hashOtp,
    getOtpExpiry,
    compareOtp,
} from "../utils/otp.js";

import { generateAccessToken, generateRefreshToken, verifyRefreshToken, isTokenBlacklisted } from "../utils/jwt.js";

import EmailService from "./email.service.js";
import AppError from "../utils/appError.js";
import { normalizeFullName } from "../utils/name.js";

class AuthService {
    static async register(data) {
        const { fullName, email, password, registrationNumber, mobileNumber } = data;

        const normalizedEmail = email.toLowerCase();
        const normalizedName = normalizeFullName(fullName);

        const existingUser = await UserRepository.findOne({
            $or: [
                { email: normalizedEmail },
                { mobileNumber },
                { registrationNumber },
            ],
        });

        if (existingUser) {
            throw new AppError("User already exists", 409);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const user = await UserRepository.create({
                fullName: normalizedName,
                email: normalizedEmail,
                password,
                registrationNumber,
                mobileNumber,
                isVerified: false,
            });

            const otp = generateOtp();
            const hashedOtp = await hashOtp(otp);

            await OtpRepository.create({
                user: user._id,
                type: "VERIFY_ACCOUNT",
                hashedOtp,
                expiresAt: getOtpExpiry(),
            }, { session });

            await session.commitTransaction();

            await EmailService.sendOtpEmail(normalizedEmail, otp);

            return {
                message: "Registration successful. OTP sent for verification.",
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async verifyAccount(email, otpInput) {
        const normalizedEmail = email.toLowerCase();

        const user = await UserRepository.findOne({ email: normalizedEmail });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isVerified) {
            throw new AppError("Account already verified", 400);
        }

        const otpRecord = await OtpRepository.findOne({
            user: user._id,
            type: "VERIFY_ACCOUNT",
        }, { select: "+hashedOtp" });

        if (!otpRecord) {
            throw new AppError("OTP not found or expired", 400);
        }

        if (otpRecord.expiresAt < new Date()) {
            throw new AppError("OTP expired", 400);
        }

        if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
            await OtpRepository.deleteOne({ _id: otpRecord._id });
            throw new AppError("Too many failed attempts. Please request a new OTP.", 429);
        }

        const isMatch = await compareOtp(otpInput, otpRecord.hashedOtp);

        if (!isMatch) {
            otpRecord.attempts += 1;
            await OtpRepository.save(otpRecord);
            throw new AppError(`Invalid OTP. ${OTP_MAX_ATTEMPTS - otpRecord.attempts} attempts remaining.`, 400);
        }

        user.isVerified = true;
        await UserRepository.save(user);

        await OtpRepository.deleteOne({ _id: otpRecord._id });

        const family = TokenRotationService.generateTokenFamily();
        const accessToken = generateAccessToken({
            userId: user._id,
            role: user.role,
        });

        const refreshToken = generateRefreshToken({
            userId: user._id,
            role: user.role,
        }, family);

        await TokenRotationService.storeRefreshToken(user._id.toString(), refreshToken, family);

        return {
            message: "Account verified successfully",
            accessToken,
            refreshToken,
        };
    }

    static async login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();

        const user = await UserRepository.findOne(
            { email: normalizedEmail },
            { select: "+password" }
        );

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        if (!user.isVerified) {
            const otp = generateOtp();
            const hashedOtp = await hashOtp(otp);

            await OtpRepository.deleteMany({
                user: user._id,
                type: "VERIFY_ACCOUNT",
            });

            await OtpRepository.create({
                user: user._id,
                type: "VERIFY_ACCOUNT",
                hashedOtp,
                expiresAt: getOtpExpiry(),
            });

            await EmailService.sendOtpEmail(normalizedEmail, otp);

            return {
                verificationRequired: true,
                message: "Account not verified. OTP resent.",
            };
        }

        if (user.isCurrentlyBanned()) {
            throw new AppError("Account is banned", 403);
        }

        const isMatch = await user.comparePassword(password.trim());

        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        const family = TokenRotationService.generateTokenFamily();
        const accessToken = generateAccessToken({
            userId: user._id,
            role: user.role,
        });

        const refreshToken = generateRefreshToken({
            userId: user._id,
            role: user.role,
        }, family);

        await TokenRotationService.storeRefreshToken(user._id.toString(), refreshToken, family);

        return {
            accessToken,
            refreshToken,
        };
    }

    static async logout() {
        return { message: "Logged out successfully" };
    }

    static async resendOtp(email) {
        const normalizedEmail = email.toLowerCase().trim();

        const user = await UserRepository.findOne({ email: normalizedEmail });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isVerified) {
            throw new AppError("Account already verified", 400);
        }

        const otp = generateOtp();
        const hashedOtp = await hashOtp(otp);

        await OtpRepository.deleteMany({
            user: user._id,
            type: "VERIFY_ACCOUNT",
        });

        await OtpRepository.create({
            user: user._id,
            type: "VERIFY_ACCOUNT",
            hashedOtp,
            expiresAt: getOtpExpiry(),
        });

        await EmailService.sendOtpEmail(normalizedEmail, otp);

        return {
            message: "OTP resent successfully",
        };
    }

    static async refreshToken(refreshToken) {
        const blacklisted = await isTokenBlacklisted(refreshToken);
        if (blacklisted) {
            throw new AppError("Token has been revoked", 401);
        }

        let decoded;
        try {
            decoded = await verifyRefreshToken(refreshToken);
        } catch (error) {
            throw new AppError(error.message || "Invalid or expired refresh token", 401);
        }

        const user = await UserRepository.findById(decoded.userId);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isCurrentlyBanned()) {
            throw new AppError("Account is banned", 403);
        }

        const newFamily = await TokenRotationService.rotateRefreshToken(decoded.userId, decoded.family);
        const accessToken = generateAccessToken({
            userId: user._id,
            role: user.role,
        });

        const newRefreshToken = generateRefreshToken({
            userId: user._id,
            role: user.role,
        }, newFamily);

        await TokenRotationService.storeRefreshToken(user._id.toString(), newRefreshToken, newFamily);

        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }
}

export default AuthService;
