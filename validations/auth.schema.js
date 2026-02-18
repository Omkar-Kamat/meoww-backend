import { z } from "zod";

export const registerSchema = z.object({
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
    identifier: z.string().min(3),
    otp: z.string().length(6),
});

export const loginSchema = z.object({
    identifier: z.string().min(3),
    password: z.string().min(8),
});
