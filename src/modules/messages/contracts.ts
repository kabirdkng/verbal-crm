import { z } from "zod";

export const SendMessageRequestSchema = z
  .object({
    body: z.string().trim().min(1).max(4096).optional(),
    templateName: z.string().trim().min(1).max(120).optional()
  })
  .refine((value) => Boolean(value.body || value.templateName), {
    message: "Either body or templateName is required"
  });

export const MessageResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  conversationId: z.string(),
  contactId: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  channel: z.literal("whatsapp"),
  body: z.string(),
  status: z.enum(["received", "queued", "sent", "failed", "delivered"]),
  providerMessageId: z.string().nullable(),
  templateName: z.string().nullable(),
  createdAt: z.string(),
  createdByUserId: z.string().nullable()
});

export const ListMessagesResponseSchema = z.object({
  data: z.array(MessageResponseSchema)
});

export const SendMessageResponseSchema = z.object({
  data: MessageResponseSchema
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
