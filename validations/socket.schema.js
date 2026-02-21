import { z } from "zod";

export const offerSchema = z.object({
  sessionId: z.string().min(1),
  offer: z.object({
    type: z.literal("offer"),
    sdp: z.string().min(1),
  }),
});

export const answerSchema = z.object({
  sessionId: z.string().min(1),
  answer: z.object({
    type: z.literal("answer"),
    sdp: z.string().min(1),
  }),
});

export const iceCandidateSchema = z.object({
  sessionId: z.string().min(1),
  candidate: z.object({
    candidate: z.string(),
    sdpMLineIndex: z.number().nullable(),
    sdpMid: z.string().nullable(),
  }).nullable(),
});

export const connectionStateSchema = z.object({
  sessionId: z.string().min(1),
  state: z.enum(["new", "connecting", "connected", "disconnected", "failed", "closed"]),
});

export const iceRestartSchema = z.object({
  sessionId: z.string().min(1),
});
