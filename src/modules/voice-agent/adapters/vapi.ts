import { createId } from "@/lib/ids";
import type { VoiceAgentConfigRecord } from "@/lib/store";
import { loadVapiConfig, type VapiRuntimeConfig } from "@/modules/voice-agent/config";

export type VapiOutboundInput = {
  to: string;
  config: VoiceAgentConfigRecord;
  /** CRM call id for correlation in metadata / webhooks */
  callId: string;
  contactName?: string;
  conversationContext?: string;
  /** Override API key / phone from tenant or platform */
  apiKey?: string | null;
  phoneNumberId?: string | null;
  assistantId?: string | null;
};

export type VapiOutboundResult = {
  providerCallId: string;
  status: "initiated" | "failed";
  errorMessage?: string;
};

export type VapiTransientAssistant = {
  name: string;
  firstMessage: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{ role: "system"; content: string }>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  metadata?: Record<string, string>;
};

export interface VapiClient {
  createOutboundCall(input: VapiOutboundInput): Promise<VapiOutboundResult>;
}

export type VapiFetch = typeof fetch;

export function buildTransientAssistant(input: {
  config: VoiceAgentConfigRecord;
  contactName?: string;
  conversationContext?: string;
  callId: string;
}): VapiTransientAssistant {
  const { config } = input;
  const system = [
    config.systemPrompt,
    "",
    `Company: ${config.companyName}`,
    `Agent name: ${config.agentName}`,
    `Language: ${config.language}`,
    config.knowledgeBase ? `\nBusiness knowledge:\n${config.knowledgeBase}` : null,
    input.contactName ? `\nYou are speaking with: ${input.contactName}` : null,
    input.conversationContext
      ? `\nRecent CRM conversation context:\n${input.conversationContext}`
      : null,
    "",
    "If the customer asks for a human, acknowledge and note that a teammate will follow up."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    name: `${config.agentName} (${config.companyName})`.slice(0, 80),
    firstMessage: config.firstMessage,
    model: {
      provider: "openai",
      model: config.model || "gpt-4o",
      messages: [{ role: "system", content: system }]
    },
    voice: {
      provider: config.voiceProvider || "11labs",
      voiceId: config.voiceId || "sarah"
    },
    metadata: {
      verbalCallId: input.callId,
      organizationId: config.organizationId
    }
  };
}

/** Local mock — no network; returns synthetic Vapi call ids. */
export class MockVapiClient implements VapiClient {
  readonly calls: VapiOutboundInput[] = [];

  async createOutboundCall(input: VapiOutboundInput): Promise<VapiOutboundResult> {
    this.calls.push(input);
    if (!input.config.enabled) {
      return {
        providerCallId: createId("vapi_fail"),
        status: "failed",
        errorMessage: "Voice agent is disabled for this tenant"
      };
    }
    return {
      providerCallId: createId("vapi"),
      status: "initiated"
    };
  }
}

/**
 * Vapi REST client — POST https://api.vapi.ai/call
 * Uses transient assistant from tenant context or saved assistantId.
 */
export class HttpVapiClient implements VapiClient {
  constructor(
    private readonly runtime: VapiRuntimeConfig = loadVapiConfig(),
    private readonly fetchImpl: VapiFetch = fetch
  ) {}

  async createOutboundCall(input: VapiOutboundInput): Promise<VapiOutboundResult> {
    if (!input.config.enabled) {
      return {
        providerCallId: createId("vapi_fail"),
        status: "failed",
        errorMessage: "Voice agent is disabled for this tenant"
      };
    }

    const apiKey = input.apiKey || this.runtime.apiKey;
    if (!apiKey) {
      return {
        providerCallId: createId("vapi_fail"),
        status: "failed",
        errorMessage: "VAPI_API_KEY is not configured (platform or tenant)"
      };
    }

    const phoneNumberId = input.phoneNumberId || this.runtime.phoneNumberId;
    if (!phoneNumberId) {
      return {
        providerCallId: createId("vapi_fail"),
        status: "failed",
        errorMessage: "VAPI_PHONE_NUMBER_ID is not configured (platform or tenant)"
      };
    }

    const to = input.to.startsWith("+") ? input.to : `+${input.to.replace(/\D/g, "")}`;
    const assistantId = input.assistantId || this.runtime.assistantId;
    const body: Record<string, unknown> = {
      phoneNumberId,
      customer: {
        number: to,
        name: input.contactName
      },
      metadata: {
        verbalCallId: input.callId,
        organizationId: input.config.organizationId
      }
    };

    if (assistantId) {
      body.assistantId = assistantId;
      // Still pass variableValues-style context via assistantOverrides when fixed assistant
      body.assistantOverrides = {
        firstMessage: input.config.firstMessage,
        variableValues: {
          companyName: input.config.companyName,
          agentName: input.config.agentName,
          knowledgeBase: input.config.knowledgeBase,
          contactName: input.contactName ?? "",
          conversationContext: input.conversationContext ?? ""
        },
        model: {
          provider: "openai",
          model: input.config.model || "gpt-4o",
          messages: [
            {
              role: "system",
              content: buildTransientAssistant({
                config: input.config,
                contactName: input.contactName,
                conversationContext: input.conversationContext,
                callId: input.callId
              }).model.messages[0]!.content
            }
          ]
        }
      };
    } else {
      body.assistant = buildTransientAssistant({
        config: input.config,
        contactName: input.contactName,
        conversationContext: input.conversationContext,
        callId: input.callId
      });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.runtime.timeoutMs);
      const response = await this.fetchImpl(`${this.runtime.baseUrl}/call`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify(body)
      });
      clearTimeout(timer);

      const json = (await response.json().catch(() => ({}))) as {
        id?: string;
        error?: string | { message?: string };
        message?: string;
      };

      if (!response.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : json.error?.message ?? json.message ?? `Vapi error (${response.status})`;
        return {
          providerCallId: createId("vapi_fail"),
          status: "failed",
          errorMessage: msg
        };
      }

      if (!json.id) {
        return {
          providerCallId: createId("vapi_fail"),
          status: "failed",
          errorMessage: "Vapi returned no call id"
        };
      }

      return { providerCallId: json.id, status: "initiated" };
    } catch (error) {
      return {
        providerCallId: createId("vapi_fail"),
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Vapi network error"
      };
    }
  }
}

export function createVapiClient(
  runtime: VapiRuntimeConfig = loadVapiConfig(),
  fetchImpl: VapiFetch = fetch
): VapiClient {
  if (runtime.mode === "vapi") {
    return new HttpVapiClient(runtime, fetchImpl);
  }
  return new MockVapiClient();
}
