import { z } from "zod";

export const CallDirectionSchema = z.enum(["business_initiated", "user_initiated"]);
export const CallStatusSchema = z.enum([
  "initiated",
  "ringing",
  "connecting",
  "active",
  "rejected",
  "missed",
  "completed",
  "failed",
  "permission_pending"
]);

export const CallChannelSchema = z.enum(["whatsapp", "vapi"]);

export const InitiateCallRequestSchema = z
  .object({
    conversationId: z.string().min(1).optional(),
    contactId: z.string().min(1).optional(),
    /** whatsapp (Meta VoIP) or vapi (AI voice agent) */
    channel: CallChannelSchema.optional().default("whatsapp"),
    /** Optional WebRTC SDP offer (required for live Meta media; mock accepts empty). */
    sdp: z.string().min(1).optional(),
    sdpType: z.enum(["offer"]).optional().default("offer")
  })
  .refine((v) => Boolean(v.conversationId || v.contactId), {
    message: "conversationId or contactId is required"
  });

export const CallPermissionRequestSchema = z
  .object({
    conversationId: z.string().min(1).optional(),
    contactId: z.string().min(1).optional()
  })
  .refine((v) => Boolean(v.conversationId || v.contactId), {
    message: "conversationId or contactId is required"
  });

export const CallActionRequestSchema = z.object({
  sdp: z.string().min(1).optional(),
  sdpType: z.enum(["answer", "offer"]).optional()
});

export const SimulateInboundVapiRequestSchema = z.object({
  from: z.string().min(5).max(32),
  contactName: z.string().trim().min(1).max(120).optional()
});

export const CallResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    organizationId: z.string(),
    conversationId: z.string().nullable(),
    contactId: z.string(),
    phone: z.string(),
    direction: CallDirectionSchema,
    status: CallStatusSchema,
    channel: CallChannelSchema,
    provider: z.enum(["whatsapp", "vapi"]),
    providerCallId: z.string().nullable(),
    agentUserId: z.string().nullable(),
    answerSdp: z.string().nullable().optional(),
    durationSeconds: z.number().nullable(),
    errorMessage: z.string().nullable(),
    summary: z.string().nullable().optional(),
    startedAt: z.string().nullable(),
    endedAt: z.string().nullable(),
    createdAt: z.string()
  })
});

export const CallListResponseSchema = z.object({
  data: z.array(CallResponseSchema.shape.data)
});

export type InitiateCallRequest = z.infer<typeof InitiateCallRequestSchema>;
export type CallStatus = z.infer<typeof CallStatusSchema>;
export type CallDirection = z.infer<typeof CallDirectionSchema>;
