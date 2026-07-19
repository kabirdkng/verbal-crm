import { z } from "zod";

export const SuggestReplyRequestSchema = z.object({
  conversationId: z.string().min(1)
});

export const SuggestReplyResponseSchema = z.object({
  data: z.object({
    suggestion: z.string(),
    model: z.string(),
    usage: z.object({
      tokensIn: z.number(),
      tokensOut: z.number(),
      estimatedCostUsd: z.number()
    })
  })
});

export const AiUsageResponseSchema = z.object({
  data: z.object({
    totalEstimatedCostUsd: z.number(),
    records: z.array(
      z.object({
        id: z.string(),
        feature: z.string(),
        model: z.string(),
        tokensIn: z.number(),
        tokensOut: z.number(),
        estimatedCostUsd: z.number(),
        actorUserId: z.string(),
        createdAt: z.string()
      })
    )
  })
});

export type SuggestReplyRequest = z.infer<typeof SuggestReplyRequestSchema>;
