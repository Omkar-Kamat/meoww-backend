import AppError from "../utils/appError.js";

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
    return next(new AppError('Invalid CSRF token', 403));
  }

  next();
};

export default csrfMiddleware;
