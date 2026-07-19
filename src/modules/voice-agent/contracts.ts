import { z } from "zod";

export const VoiceAgentConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  companyName: z.string().trim().min(1).max(120).optional(),
  agentName: z.string().trim().min(1).max(80).optional(),
  systemPrompt: z.string().trim().min(1).max(8000).optional(),
  knowledgeBase: z.string().trim().max(20000).optional(),
  firstMessage: z.string().trim().min(1).max(500).optional(),
  language: z.string().trim().min(2).max(16).optional(),
  voiceProvider: z.string().trim().min(1).max(40).optional(),
  voiceId: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(80).optional(),
  /** Pass empty string to clear; omit to leave unchanged. */
  vapiApiKey: z.string().max(200).optional().nullable(),
  vapiPhoneNumberId: z.string().trim().max(80).optional().nullable(),
  vapiAssistantId: z.string().trim().max(80).optional().nullable()
});

export const VoiceAgentConfigResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    organizationId: z.string(),
    enabled: z.boolean(),
    companyName: z.string(),
    agentName: z.string(),
    systemPrompt: z.string(),
    knowledgeBase: z.string(),
    firstMessage: z.string(),
    language: z.string(),
    voiceProvider: z.string(),
    voiceId: z.string(),
    model: z.string(),
    /** Masked indicator — never returns full secret */
    hasVapiApiKey: z.boolean(),
    vapiPhoneNumberId: z.string().nullable(),
    vapiAssistantId: z.string().nullable(),
    vapiMode: z.enum(["mock", "vapi"]),
    platformPhoneConfigured: z.boolean(),
    updatedAt: z.string()
  })
});

export type VoiceAgentConfigUpdate = z.infer<typeof VoiceAgentConfigUpdateSchema>;
