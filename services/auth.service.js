import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { generateOtp, hashOtp, getOtpExpiry } from "../utils/otp.js";
import EmailService from "./email.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt.js";
import { compareOtp } from "../utils/otp.js";

class AuthService {

  // registration
  static async register(data) {
    const { email, password, registrationNumber, mobileNumber } = data;

    const existingUser = await User.findOne({
      $or: [
        { email },
        { mobileNumber },
        { registrationNumber },
      ],
    });

    if (existingUser) {
      throw new Error("User already exists");
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

  // verify registration otp
  static async verifyAccount(identifier, otpInput) {
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobileNumber: identifier }],
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isVerified) {
      throw new Error("Account already verified");
    }

    const otpRecord = await Otp.findOne({
      user: user._id,
      type: "VERIFY_ACCOUNT",
    }).select("+hashedOtp");

    if (!otpRecord) {
      throw new Error("OTP not found or expired");
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new Error("OTP expired");
    }

    if (otpRecord.attempts >= 5) {
      throw new Error("Maximum OTP attempts exceeded");
    }

    const isMatch = await compareOtp(
      otpInput,
      otpRecord.hashedOtp
    );

    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error("Invalid OTP");
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
    throw new Error("Invalid credentials");
  }

  if (!user.isVerified) {
    throw new Error("Account not verified");
  }

  if (user.isCurrentlyBanned()) {
    throw new Error("Account is banned");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
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

}

export default AuthService;
