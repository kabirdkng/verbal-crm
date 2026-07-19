import { createId } from "@/lib/ids";
import { getStore, type VoiceAgentConfigRecord } from "@/lib/store";

export type { VoiceAgentConfigRecord };

export type VoiceAgentConfigInput = {
  enabled?: boolean;
  companyName?: string;
  agentName?: string;
  systemPrompt?: string;
  knowledgeBase?: string;
  firstMessage?: string;
  language?: string;
  voiceProvider?: string;
  voiceId?: string;
  model?: string;
  vapiApiKey?: string | null;
  vapiPhoneNumberId?: string | null;
  vapiAssistantId?: string | null;
};

const DEFAULTS = {
  enabled: true,
  companyName: "Organization",
  agentName: "AI Assistant",
  systemPrompt:
    "You are a helpful AI voice and chat agent for this business. Be concise, accurate, and professional. Never invent facts.",
  knowledgeBase: "",
  firstMessage: "Hello! How can I help you today?",
  language: "en",
  voiceProvider: "11labs",
  voiceId: "sarah",
  model: "gpt-4o"
};

export interface VoiceAgentConfigRepository {
  findByOrganization(organizationId: string): Promise<VoiceAgentConfigRecord | null>;
  findByVapiPhoneNumberId(phoneNumberId: string): Promise<VoiceAgentConfigRecord | null>;
  getOrCreate(organizationId: string, companyName?: string): Promise<VoiceAgentConfigRecord>;
  update(organizationId: string, input: VoiceAgentConfigInput): Promise<VoiceAgentConfigRecord>;
}

export class InMemoryVoiceAgentConfigRepository implements VoiceAgentConfigRepository {
  async findByOrganization(organizationId: string): Promise<VoiceAgentConfigRecord | null> {
    return (
      getStore().voiceAgentConfigs.find((item) => item.organizationId === organizationId) ?? null
    );
  }

  async findByVapiPhoneNumberId(phoneNumberId: string): Promise<VoiceAgentConfigRecord | null> {
    return (
      getStore().voiceAgentConfigs.find(
        (item) => item.vapiPhoneNumberId === phoneNumberId
      ) ?? null
    );
  }

  async getOrCreate(
    organizationId: string,
    companyName?: string
  ): Promise<VoiceAgentConfigRecord> {
    const existing = await this.findByOrganization(organizationId);
    if (existing) return existing;
    const now = new Date();
    const row: VoiceAgentConfigRecord = {
      id: createId("vac"),
      organizationId,
      ...DEFAULTS,
      companyName: companyName ?? DEFAULTS.companyName,
      systemPrompt: DEFAULTS.systemPrompt.replace(
        "this business",
        companyName ?? "this business"
      ),
      vapiApiKey: null,
      vapiPhoneNumberId: null,
      vapiAssistantId: null,
      createdAt: now,
      updatedAt: now
    };
    getStore().voiceAgentConfigs.push(row);
    return row;
  }

  async update(
    organizationId: string,
    input: VoiceAgentConfigInput
  ): Promise<VoiceAgentConfigRecord> {
    const row = await this.getOrCreate(organizationId);
    if (input.enabled !== undefined) row.enabled = input.enabled;
    if (input.companyName !== undefined) row.companyName = input.companyName;
    if (input.agentName !== undefined) row.agentName = input.agentName;
    if (input.systemPrompt !== undefined) row.systemPrompt = input.systemPrompt;
    if (input.knowledgeBase !== undefined) row.knowledgeBase = input.knowledgeBase;
    if (input.firstMessage !== undefined) row.firstMessage = input.firstMessage;
    if (input.language !== undefined) row.language = input.language;
    if (input.voiceProvider !== undefined) row.voiceProvider = input.voiceProvider;
    if (input.voiceId !== undefined) row.voiceId = input.voiceId;
    if (input.model !== undefined) row.model = input.model;
    if (input.vapiApiKey !== undefined) {
      row.vapiApiKey =
        input.vapiApiKey === "" || input.vapiApiKey === null ? null : input.vapiApiKey;
    }
    if (input.vapiPhoneNumberId !== undefined) {
      row.vapiPhoneNumberId =
        input.vapiPhoneNumberId === "" ? null : input.vapiPhoneNumberId;
    }
    if (input.vapiAssistantId !== undefined) {
      row.vapiAssistantId = input.vapiAssistantId === "" ? null : input.vapiAssistantId;
    }
    row.updatedAt = new Date();
    return row;
  }
}
