export const RECONNECT_GRACE_PERIOD_SECONDS = 15;
export const RECONNECT_CLEANUP_INTERVAL_MS = 5000;

export const SIGNALING_RATE_LIMIT = 50;
export const SIGNALING_WINDOW_SECONDS = 10;
export const ICE_CANDIDATE_BUFFER_TTL_SECONDS = 60;

export const MAX_SOCKET_CONNECTIONS_PER_USER = 5;
export const SOCKET_MESSAGE_SIZE_LIMIT = 100000;

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;

export const PASSWORD_SALT_ROUNDS = 12;
export const OTP_SALT_ROUNDS = 10;

export const COOKIE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_AUTH_MAX = 5;
export const RATE_LIMIT_OTP_MAX = 3;
export const RATE_LIMIT_MATCH_MAX = 10;
export const RATE_LIMIT_USER_MAX = 100;
export const RATE_LIMIT_ADMIN_MAX = 50;
export const RATE_LIMIT_REPORT_MAX = 10;

export const AUTO_BAN_DURATION_HOURS = 2;

export const MAX_PAGINATION_LIMIT = 100;
