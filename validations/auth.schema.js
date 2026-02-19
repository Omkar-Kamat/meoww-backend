import { z } from "zod";

export const registerSchema = z.object({
    fullName: z.string().min(2).max(100).trim(),
    email: z
        .email()
        .refine((email) => email.toLowerCase().endsWith("@lpu.in"), {
            message: "Only @lpu.in email addresses are allowed",
        }),
    password: z.string().min(8),
    registrationNumber: z.string().min(3),
    mobileNumber: z.string().min(10),
});

export const verifySchema = z.object({
    email: z
        .email()
        .refine((email) => email.toLowerCase().endsWith("@lpu.in"), {
            message: "Only @lpu.in email addresses are allowed",
        }),
    otp: z.string().length(6),
});

export const loginSchema = z.object({
    email: z
        .email()
        .refine((email) => email.toLowerCase().endsWith("@lpu.in"), {
            message: "Only @lpu.in email addresses are allowed",
        }),
    password: z.string().min(8),
});

export const resendOtpSchema = z.object({
  email: z
    .string()
    .email()
    .refine(
      (email) => email.toLowerCase().endsWith("@lpu.in"),
      { message: "Only @lpu.in email addresses are allowed" }
    ),
});

