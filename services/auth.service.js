import User from "../models/User.js";
import Otp from "../models/Otp.js";

import {
    generateOtp,
    hashOtp,
    getOtpExpiry,
    compareOtp,
} from "../utils/otp.js";

import { generateAccessToken } from "../utils/jwt.js";

import EmailService from "./email.service.js";
import AppError from "../utils/appError.js";
import { normalizeFullName } from "../utils/name.js";

class AuthService {
    //register
    static async register(data) {
        const { fullName, email, password, registrationNumber, mobileNumber } =
            data;

        const normalizedEmail = email.toLowerCase();
        const normalizedName = normalizeFullName(fullName);

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { mobileNumber },
                { registrationNumber },
            ],
        });

        if (existingUser) {
            throw new AppError("User already exists", 409);
        }

        const user = new User({
            fullName: normalizedName,
            email: normalizedEmail,
            password,
            registrationNumber,
            mobileNumber,
            isVerified: false,
        });

        await user.save();

        const otp = generateOtp();
        const hashedOtp = await hashOtp(otp);

        await Otp.create({
            user: user._id,
            type: "VERIFY_ACCOUNT",
            hashedOtp,
            expiresAt: getOtpExpiry(),
        });

        await EmailService.sendOtpEmail(normalizedEmail, otp);

        return {
            message: "Registration successful. OTP sent for verification.",
        };
    }

    // verify
    static async verifyAccount(email, otpInput) {
        const normalizedEmail = email.toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });

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

        const isMatch = await compareOtp(otpInput, otpRecord.hashedOtp);

        if (!isMatch) {
            throw new AppError("Invalid OTP", 400);
        }

        user.isVerified = true;
        await user.save();

        await Otp.deleteOne({ _id: otpRecord._id });

        const accessToken = generateAccessToken({
            userId: user._id,
            role: user.role,
        });

        return {
            message: "Account verified successfully",
            accessToken,
        };
    }

    // login
    static async login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail }).select(
            "+password",
        );

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        if (!user.isVerified) {
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

        const accessToken = generateAccessToken({
            userId: user._id,
            role: user.role,
        });

        return {
            accessToken,
        };
    }

    // logout
    static async logout() {
        return { message: "Logged out successfully" };
    }
}

export default AuthService;
