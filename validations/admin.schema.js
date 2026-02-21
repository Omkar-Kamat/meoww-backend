import { z } from "zod";

export const banUserSchema = z.object({
    userId: z.string().min(1),
    durationHours: z.number().min(1).max(8760).optional(),
});

export const userIdSchema = z.object({
    userId: z.string().min(1),
});

export const paginationSchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
});
