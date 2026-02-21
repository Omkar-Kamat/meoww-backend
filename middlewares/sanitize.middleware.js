import AppError from "../utils/appError.js";

const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return value
      .replace(/[<>]/g, "")
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return sanitizeObject(value);
  }
  return value;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeValue(obj[key]);
    }
  }
  return sanitized;
};

export const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

export const csrfMiddleware = (req, res, next) => {
  const publicPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/verify',
    '/api/v1/auth/resend-otp',
    '/api/v1/health'
  ];

  if (publicPaths.includes(req.path) || req.method === 'GET') {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const AppError = (await import('../utils/appError.js')).default;
    return next(new AppError('Invalid CSRF token', 403));
  }

  next();
};

export default sanitizeMiddleware;
