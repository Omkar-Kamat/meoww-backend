const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const shouldLog = (level) => {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  const currentLevel = process.env.LOG_LEVEL || 'INFO';
  return levels.indexOf(level) <= levels.indexOf(currentLevel);
};

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
    env: process.env.NODE_ENV,
  };
  return JSON.stringify(logEntry);
};

export const logger = {
  error: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(formatLog(LOG_LEVELS.ERROR, message, meta));
    }
  },
  warn: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
    }
  },
  info: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(formatLog(LOG_LEVELS.INFO, message, meta));
    }
  },
  debug: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  },
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
