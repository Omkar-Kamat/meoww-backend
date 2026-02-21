const requiredEnvVars = [
  "PORT",
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "REDIS_URL",
  "FRONTEND_URL",
  "NODE_ENV",
  "REPORT_THRESHOLD",
];

export const validateEnv = () => {
  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be at least 32 characters long");
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters long");
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  }

  if (isNaN(parseInt(process.env.PORT))) {
    throw new Error("PORT must be a valid number");
  }

  if (isNaN(parseInt(process.env.REPORT_THRESHOLD))) {
    throw new Error("REPORT_THRESHOLD must be a valid number");
  }
};
