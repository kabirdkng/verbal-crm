import { z } from "zod";

export const CreateConversationRequestSchema = z.object({
  contactId: z.string().min(1),
  phone: z.string().trim().min(8).max(32).optional()
});

export const ConversationResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  contactId: z.string(),
  phone: z.string(),
  status: z.enum(["open", "pending", "closed"]),
  lastMessageAt: z.string().nullable(),
  lastInboundAt: z.string().nullable(),
  serviceWindowOpen: z.boolean(),
  assignedUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ListConversationsResponseSchema = z.object({
  data: z.array(ConversationResponseSchema)
});

export const GetConversationResponseSchema = z.object({
  data: ConversationResponseSchema
});

export const CreateConversationResponseSchema = z.object({
  data: ConversationResponseSchema
});

export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
