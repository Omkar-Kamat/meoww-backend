import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import {
  signupService,
  loginService,
} from "../services/auth.service.js";
import { verifyAccessToken } from "../utils/token.utils.js";
import { refreshService } from "../services/auth.service.js";

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
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    const { newAccessToken, newRefreshToken } =
      await refreshService(refreshToken);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const user = req.user;

    await User.findByIdAndUpdate(user._id, {
      refreshTokenHash: null,
    });

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};