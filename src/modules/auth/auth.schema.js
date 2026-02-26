import { z } from "zod";

export const signupSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(50),
        username: z
            .string()
            .min(3)
            .max(20)
            .regex(
                /^[a-z0-9_]+$/,
                "Username can only contain lowercase letters, numbers and underscores",
            )
            .transform((val) => val.trim().toLowerCase())
            .refine(
                (val) => !["admin", "meoww", "support", "test"].includes(val),
                {
                    message: "This username is not allowed",
                },
            ),
        email: z.string().email(),
        password: z.string().min(6).max(100),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    }),
});

export const verifySchema = z.object({
    body: z.object({
        userId: z.string().length(24),
        otp: z.string().length(6),
    }),
});

export const resendOtpSchema = z.object({
    body: z.object({
        userId: z.string().length(24),
    }),
});
