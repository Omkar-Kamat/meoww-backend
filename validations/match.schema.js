import { z } from "zod";

export const sessionIdSchema = z.object({
    sessionId: z.string().min(1),
});

export const reportSchema = z.object({
    sessionId: z.string().min(1),
    reason: z.string().min(5).max(500),
});
