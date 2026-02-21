import jwt from "jsonwebtoken";
import { getRedis } from "../config/redis.js";
import { COOKIE_MAX_AGE_MS } from "./constants.js";
import TokenRotationService from "../security/tokenRotation.js";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "2h",
  });
};

export const generateRefreshToken = (payload, family) => {
  return jwt.sign({ ...payload, family }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  
  if (decoded.family) {
    const isRevoked = await TokenRotationService.isTokenFamilyRevoked(decoded.userId, decoded.family);
    if (isRevoked) throw new Error('Token family revoked');
    
    const validation = await TokenRotationService.validateTokenFamily(decoded.userId, token, decoded.family);
    if (!validation.valid) {
      if (validation.reused) throw new Error('Token reuse detected');
      throw new Error('Invalid token');
    }
  }
  
  return decoded;
};

export const getCookieConfig = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: COOKIE_MAX_AGE_MS,
  path: "/",
});

export const getRefreshCookieConfig = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

export const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return;

    const redis = getRedis();
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);

    if (ttl > 0) {
      await redis.setEx(`blacklist:${token}`, ttl, "1");
    }
  } catch (error) {
    const { logger } = await import("./appError.js");
    logger.error("Error blacklisting token", { error: error.message });
  }
};

export const isTokenBlacklisted = async (token) => {
  try {
    const redis = getRedis();
    const result = await redis.exists(`blacklist:${token}`);
    return result === 1;
  } catch (error) {
    const { logger } = await import("./appError.js");
    logger.error("Error checking blacklist", { error: error.message });
    return false;
  }
};
