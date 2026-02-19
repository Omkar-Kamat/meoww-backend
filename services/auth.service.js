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
import { normalizeFullName } from "../utils/name.js";

class AuthService {
  // ================= REGISTER =================
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

    const session = await User.startSession();
    session.startTransaction();

    try {
      const [user] = await User.create(
        [
          {
            fullName: normalizedName,
            email: normalizedEmail,
            password,
            registrationNumber,
            mobileNumber,
            isVerified: false,
          },
        ],
        { session }
      );

      const otp = generateOtp();
      const hashedOtp = await hashOtp(otp);

      await Otp.create(
        [
          {
            user: user._id,
            type: "VERIFY_ACCOUNT",
            hashedOtp,
            expiresAt: getOtpExpiry(),
          },
        ],
        { session }
      );

      await EmailService.sendOtpEmail(normalizedEmail, otp);

      await session.commitTransaction();
      session.endSession();

      return {
        message: "Registration successful. OTP sent for verification.",
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  // ================= VERIFY =================
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

    if (otpRecord.attempts >= 5) {
      throw new AppError("Maximum OTP attempts exceeded", 429);
    }

    const isMatch = await compareOtp(otpInput, otpRecord.hashedOtp);

    if (!isMatch) {
      await Otp.updateOne(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } }
      );
      throw new AppError("Invalid OTP", 400);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { isVerified: true } }
    );

    await Otp.deleteOne({ _id: otpRecord._id });

    const payload = {
      userId: user._id,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    return {
      message: "Account verified successfully",
      accessToken,
      refreshToken,
    };
  }

  // ================= LOGIN =================
  static async login(email, password) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

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
    console.log("Entered password (raw):", JSON.stringify(password));
console.log("Entered length:", password.length);
console.log("Stored hash:", user.password);

    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const payload = {
      userId: user._id,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  // ================= REFRESH =================
  static async refresh(refreshTokenFromCookie) {
    if (!refreshTokenFromCookie) {
      throw new AppError("Refresh token missing", 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenFromCookie);
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await User.findById(decoded.userId).select(
      "+refreshToken"
    );

    if (!user || user.refreshToken !== refreshTokenFromCookie) {
      throw new AppError("Invalid refresh token", 401);
    }

    if (user.isCurrentlyBanned()) {
      throw new AppError("Account is banned", 403);
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

  // ================= LOGOUT =================
  static async logoutByToken(refreshTokenFromCookie) {
    if (!refreshTokenFromCookie) {
      throw new AppError("Refresh token missing", 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenFromCookie);
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }

    await User.updateOne(
      { _id: decoded.userId },
      { $set: { refreshToken: null } }
    );

    return { message: "Logged out successfully" };
  }
}

export default AuthService;
