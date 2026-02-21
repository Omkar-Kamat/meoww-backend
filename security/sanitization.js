import validator from 'validator';
import mongoSanitize from 'express-mongo-sanitize';

export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(validator.trim(input));
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

export const advancedSanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
};

export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ key }) => {
    console.warn(`Sanitized key: ${key}`);
  },
});

export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validateMobileNumber = (mobile) => {
  return validator.isMobilePhone(mobile, 'any');
};

export const validateURL = (url) => {
  return validator.isURL(url);
};
