import { z } from "zod";

export const AiActionSchema = z.enum([
  "suggest_reply",
  "improve_draft",
  "summarize",
  "next_steps",
  "translate"
]);

export const AiToneSchema = z.enum([
  "professional",
  "friendly",
  "empathetic",
  "concise",
  "formal"
]);

/** Unified assist payload used by agents, managers, and admins. */
export const AiAssistRequestSchema = z.object({
  conversationId: z.string().min(1),
  action: AiActionSchema.default("suggest_reply"),
  tone: AiToneSchema.optional().default("professional"),
  /** Required for improve_draft; optional free-text guidance for other actions. */
  draft: z.string().trim().max(4000).optional(),
  instruction: z.string().trim().max(500).optional(),
  /** Target language for translate (e.g. es, fr, hi). */
  language: z.string().trim().min(2).max(32).optional()
});

export const SuggestReplyRequestSchema = z.object({
  conversationId: z.string().min(1)
});

export const AiUsageItemSchema = z.object({
  id: z.string(),
  feature: z.string(),
  model: z.string(),
  tokensIn: z.number(),
  tokensOut: z.number(),
  estimatedCostUsd: z.number(),
  actorUserId: z.string(),
  createdAt: z.string()
});

export const AiBudgetSchema = z.object({
  budgetUsd: z.number(),
  spentUsd: z.number(),
  remainingUsd: z.number(),
  percentUsed: z.number()
});

export const SuggestReplyResponseSchema = z.object({
  data: z.object({
    suggestion: z.string(),
    model: z.string(),
    action: AiActionSchema.optional(),
    usage: z.object({
      tokensIn: z.number(),
      tokensOut: z.number(),
      estimatedCostUsd: z.number()
    }),
    budget: AiBudgetSchema.optional()
  })
});

export const AiAssistResponseSchema = SuggestReplyResponseSchema;

export const AiUsageResponseSchema = z.object({
  data: z.object({
    totalEstimatedCostUsd: z.number(),
    budget: AiBudgetSchema,
    records: z.array(AiUsageItemSchema)
  })
});

export const AiBudgetResponseSchema = z.object({
  data: AiBudgetSchema
});

export type AiAssistRequest = z.infer<typeof AiAssistRequestSchema>;
export type SuggestReplyRequest = z.infer<typeof SuggestReplyRequestSchema>;
export type AiAction = z.infer<typeof AiActionSchema>;
export type AiTone = z.infer<typeof AiToneSchema>;
