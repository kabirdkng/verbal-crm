import { getPrismaAdmin } from "@/lib/prisma";
import type {
  VoiceAgentConfigInput,
  VoiceAgentConfigRecord,
  VoiceAgentConfigRepository
} from "@/modules/voice-agent/repository";

function mapRow(row: {
  id: string;
  organizationId: string;
  enabled: boolean;
  companyName: string;
  agentName: string;
  systemPrompt: string;
  knowledgeBase: string;
  firstMessage: string;
  language: string;
  voiceProvider: string;
  voiceId: string;
  model: string;
  vapiApiKey: string | null;
  vapiPhoneNumberId: string | null;
  vapiAssistantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VoiceAgentConfigRecord {
  return row;
}

export class PrismaVoiceAgentConfigRepository implements VoiceAgentConfigRepository {
  async findByOrganization(organizationId: string): Promise<VoiceAgentConfigRecord | null> {
    const row = await getPrismaAdmin().voiceAgentConfig.findUnique({
      where: { organizationId }
    });
    return row ? mapRow(row) : null;
  }

  async getOrCreate(
    organizationId: string,
    companyName?: string
  ): Promise<VoiceAgentConfigRecord> {
    const existing = await this.findByOrganization(organizationId);
    if (existing) return existing;
    const row = await getPrismaAdmin().voiceAgentConfig.create({
      data: {
        organizationId,
        companyName: companyName ?? "Organization",
        agentName: "AI Assistant",
        systemPrompt: `You are a helpful AI voice and chat agent for ${companyName ?? "this business"}. Be concise, accurate, and professional. Never invent facts.`,
        knowledgeBase: "",
        firstMessage: "Hello! How can I help you today?",
        language: "en",
        voiceProvider: "11labs",
        voiceId: "sarah",
        model: "gpt-4o",
        enabled: true
      }
    });
    return mapRow(row);
  }

  async update(
    organizationId: string,
    input: VoiceAgentConfigInput
  ): Promise<VoiceAgentConfigRecord> {
    await this.getOrCreate(organizationId);
    const data: Record<string, unknown> = {};
    for (const key of [
      "enabled",
      "companyName",
      "agentName",
      "systemPrompt",
      "knowledgeBase",
      "firstMessage",
      "language",
      "voiceProvider",
      "voiceId",
      "model"
    ] as const) {
      if (input[key] !== undefined) data[key] = input[key];
    }
    if (input.vapiApiKey !== undefined) {
      data.vapiApiKey =
        input.vapiApiKey === "" || input.vapiApiKey === null ? null : input.vapiApiKey;
    }
    if (input.vapiPhoneNumberId !== undefined) {
      data.vapiPhoneNumberId =
        input.vapiPhoneNumberId === "" ? null : input.vapiPhoneNumberId;
    }
    if (input.vapiAssistantId !== undefined) {
      data.vapiAssistantId =
        input.vapiAssistantId === "" ? null : input.vapiAssistantId;
    }
    const row = await getPrismaAdmin().voiceAgentConfig.update({
      where: { organizationId },
      data
    });
    return mapRow(row);
  }
}
