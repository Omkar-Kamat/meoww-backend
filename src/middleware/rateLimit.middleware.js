import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again in 15 minutes." },
});

export const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many refresh attempts. Try again later." },
});

export const resendOtpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP requests, please wait before requesting again." },
});

export const turnLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 200,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many TURN credential requests." },
});

export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many signup attempts, please try again later." },
});

export const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many password reset requests. Please try again in an hour." },
});

/**
 * Limits profile update requests per user (not per IP) to prevent
 * someone from hammering username changes or spamming Cloudinary uploads.
 * Keyed by userId from the verified JWT — more precise than IP for
 * authenticated endpoints.
 */
export const updateProfileLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many profile update requests. Please try again later." },
});