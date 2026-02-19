import { z } from "zod";

export const updateProfileSchema = z
    .object({
        fullName: z.string().min(2).max(100).trim().optional(),

        mobileNumber: z.string().min(10).max(15).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });
