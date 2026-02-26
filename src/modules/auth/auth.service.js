import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../user/user.model.js";
import OTP from "../otp/otp.model.js";
import * as emailService from "../../services/email.service.js";

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    });
    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    });
    return { accessToken, refreshToken };
};

export const signup = async (name, username, email, password, profileImage) => {
  email = email.toLowerCase();
  username = username.toLowerCase();

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      const error = new Error("Email already exists");
      error.code = "EMAIL_EXISTS";
      throw error;
    }

    if (existingUser.username === username) {
      const error = new Error("Username already exists");
      error.code = "USERNAME_EXISTS";
      throw error;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;

  try {
    user = await User.create({
      name,
      username,
      email,
      passwordHash,
      profileImage,
      isVerified: false,
    });
  } catch (err) {
    // Handle race condition duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];

      if (field === "email") {
        const error = new Error("Email already exists");
        error.code = "EMAIL_EXISTS";
        throw error;
      }

      if (field === "username") {
        const error = new Error("Username already exists");
        error.code = "USERNAME_EXISTS";
        throw error;
      }

      const error = new Error("Duplicate key error");
      error.code = "DUPLICATE_ERROR";
      throw error;
    }

    throw err;
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await OTP.create({
      userId: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await emailService.sendOTPEmail(email, otp);
  } catch (error) {
    await User.findByIdAndDelete(user._id);

    const errObj = new Error(
      "Failed to send verification email. Please try again."
    );
    errObj.code = "EMAIL_SEND_FAILED";
    throw errObj;
  }

  const userObj = user.toObject();
  delete userObj.passwordHash;

  return userObj;
};

export const login = async (email, password) => {
    email = email.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error("Invalid credentials");
    if (!user.isVerified) {
        const error = new Error("Email not verified");
        error.code = "EMAIL_NOT_VERIFIED";
        error.userId = user._id;
        throw error;
    }
    const { accessToken, refreshToken } = generateTokens(user._id);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHash = refreshTokenHash;
    await user.save();
    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.refreshTokenHash;
    return { user: userObj, accessToken, refreshToken };
};

export const verify = async (userId, otp) => {
    const objectId = new mongoose.Types.ObjectId(userId);
    const otpRecord = await OTP.findOne({ userId: objectId }).lean();  // Removed .sort() — only 1 active OTP expected
    if (!otpRecord) throw new Error("OTP not found or expired");
    if (otpRecord.expiresAt < new Date()) throw new Error("OTP expired");
    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) throw new Error("Invalid OTP");
    const { accessToken, refreshToken } = generateTokens(userId);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const user = await User.findByIdAndUpdate(
        objectId,
        { isVerified: true, refreshTokenHash },
        { new: true }
    );
    if (!user) throw new Error("User not found");
    await OTP.deleteMany({ userId: objectId });
    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.refreshTokenHash;
    return { user: userObj, accessToken, refreshToken };
};
export const resendOtp = async (userId) => {
    const objectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(objectId);
    if (!user) throw new Error("User not found");
    if (user.isVerified) throw new Error("User is already verified");
    // Delete all existing OTPs for this user
    await OTP.deleteMany({ userId: objectId });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await OTP.create({
        userId: objectId,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await emailService.sendOTPEmail(user.email, otp);
};
export const refresh = async (refreshToken) => {
  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new Error("Invalid refresh token");
  }

  const user = await User.findById(decoded.userId);

  if (!user || !user.refreshTokenHash) {
    throw new Error("Invalid refresh token");
  }

  const isMatch = await bcrypt.compare(
    refreshToken,
    user.refreshTokenHash
  );

  if (!isMatch) {
    user.refreshTokenHash = null;
    await user.save();
    throw new Error("Token reuse detected. Session invalidated.");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    generateTokens(user._id);

  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

  // ATOMIC CHECK + UPDATE
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      refreshTokenHash: user.refreshTokenHash, // only update if still same
    },
    { refreshTokenHash: newRefreshTokenHash },
    { new: true }
  );

  if (!updatedUser) {
    // Another refresh already rotated token
    throw new Error("Refresh conflict. Please login again.");
  }

  return { accessToken, refreshToken: newRefreshToken };
};
export const logout = async (userId) => {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
};
export const getUserProfile = async (userId) => {
    const user = await User.findById(userId).select(
        "-passwordHash -refreshTokenHash",
    );
    if (!user) throw new Error("User not found");
    return user;
};