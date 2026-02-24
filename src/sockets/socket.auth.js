import cookie from "cookie";
import { verifyAccessToken } from "../utils/token.utils.js";
import { User } from "../models/user.model.js";

export const authenticateSocket = async (socket, next) => {
  try {
    const rawCookies = socket.handshake.headers.cookie;

    if (!rawCookies) {
      return next(new Error("Unauthorized"));
    }

    const parsedCookies = cookie.parse(rawCookies);

    const token = parsedCookies.accessToken;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select(
      "-passwordHash -refreshTokenHash"
    );

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.user = user;

    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
};