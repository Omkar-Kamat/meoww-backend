import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import {
    verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.utils.js";

export const signupService = async ({ name, username, email, password }) => {
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const error = new Error("User already exists");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    username,
    email,
    passwordHash,
  });

  return user;
};

export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  user.refreshTokenHash = refreshTokenHash;
  await user.save();

  return { user, accessToken, refreshToken };
};

export const refreshService = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const decoded = verifyRefreshToken(refreshToken);

  const user = await User.findById(decoded.id);

  if (!user || !user.refreshTokenHash) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(
    refreshToken,
    user.refreshTokenHash
  );

  if (!isValid) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  const newAccessToken = generateAccessToken({ id: user._id });
  const newRefreshToken = generateRefreshToken({ id: user._id });

  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  return { newAccessToken, newRefreshToken };
};