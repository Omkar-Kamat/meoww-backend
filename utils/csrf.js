import crypto from "crypto";

export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const getCsrfCookieConfig = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 2 * 60 * 60 * 1000,
  path: "/",
});
