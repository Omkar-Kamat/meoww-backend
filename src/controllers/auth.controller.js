import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import {
  signupService,
  loginService,
} from "../services/auth.service.js";
import { verifyAccessToken } from "../utils/token.utils.js";

export const signup = async (req, res, next) => {
  try {
    const user = await signupService(req.body);

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } =
      await loginService(req.body);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select(
      "-passwordHash -refreshTokenHash"
    );

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};