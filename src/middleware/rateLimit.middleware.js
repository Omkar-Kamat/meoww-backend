import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again in 15 minutes.' }
});

export const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                  // More permissive for legitimate token refreshes
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many refresh attempts. Try again later.' }
});

export const resendOtpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OTP requests, please wait before requesting again.' }
});

export const turnLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 200,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many TURN credential requests.' }
});

export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many signup attempts, please try again later.' }
});