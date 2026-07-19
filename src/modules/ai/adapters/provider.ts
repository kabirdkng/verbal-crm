import { AppError } from "@/lib/errors";
import {
  estimateCostUsd,
  loadAiConfig,
  type AiRuntimeConfig
} from "@/modules/ai/config";

export type SuggestReplyInput = {
  organizationId: string;
  conversationId: string;
  recentMessages: Array<{ direction: "inbound" | "outbound"; body: string }>;
  contactName?: string;
};

export type SuggestReplyResult = {
  suggestion: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
};

export interface AiProvider {
  suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult>;
}

export type AiFetch = typeof fetch;

/** Deterministic local provider for tests and zero-config demos. */
export class MockAiProvider implements AiProvider {
  async suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult> {
    const lastInbound = [...input.recentMessages]
      .reverse()
      .find((message) => message.direction === "inbound");

    const name = input.contactName ?? "there";
    const topic = lastInbound?.body?.slice(0, 80) ?? "your message";
    const suggestion = `Hi ${name}, thanks for reaching out about "${topic}". Happy to help — could you share a bit more detail so we can resolve this quickly?`;

    const tokensIn = Math.max(20, JSON.stringify(input.recentMessages).length / 4);
    const tokensOut = Math.max(15, suggestion.length / 4);

    return {
      suggestion,
      model: "mock-reply-v1",
      tokensIn: Math.round(tokensIn),
      tokensOut: Math.round(tokensOut),
      estimatedCostUsd: Number(((tokensIn + tokensOut) * 0.000002).toFixed(6))
    };
  }
}

/**
 * SpaceXAI / xAI provider (OpenAI-compatible Chat Completions).
 * Base: https://api.x.ai/v1 — key: XAI_API_KEY
 */
export class XaiAiProvider implements AiProvider {
  constructor(
    private readonly config: AiRuntimeConfig = loadAiConfig(),
    private readonly fetchImpl: AiFetch = fetch
  ) {}

  async suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult> {
    if (!this.config.apiKey) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "XAI_API_KEY is not configured for AI_MODE=xai"
      );
    }

    const system = [
      "You are a helpful CRM support agent assistant for WhatsApp conversations.",
      "Draft a concise, professional reply the human agent can send.",
      "Do not invent order numbers, policies, or promises not in the conversation.",
      "Keep the reply under 120 words. Return only the reply text, no preamble."
    ].join(" ");

    const history = input.recentMessages
      .map((message) => {
        const who = message.direction === "inbound" ? "Customer" : "Agent";
        return `${who}: ${message.body}`;
      })
      .join("\n");

    const userPrompt = [
      input.contactName ? `Customer name: ${input.contactName}` : null,
      "Conversation:",
      history || "(no messages yet)",
      "",
      "Draft the next agent reply:"
    ]
      .filter(Boolean)
      .join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          "content-type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          stream: false,
          temperature: 0.4,
          max_tokens: this.config.maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt }
          ]
        })
      });

      const json = (await response.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
        error?: { message?: string };
        model?: string;
      };

      if (!response.ok) {
        throw new AppError(
          "INTERNAL_ERROR",
          502,
          json.error?.message ?? `xAI API error (${response.status})`
        );
      }

      const suggestion = json.choices?.[0]?.message?.content?.trim();
      if (!suggestion) {
        throw new AppError("INTERNAL_ERROR", 502, "xAI returned empty suggestion");
      }

      const tokensIn = json.usage?.prompt_tokens ?? Math.ceil(userPrompt.length / 4);
      const tokensOut = json.usage?.completion_tokens ?? Math.ceil(suggestion.length / 4);

      return {
        suggestion,
        model: json.model ?? this.config.model,
        tokensIn,
        tokensOut,
        estimatedCostUsd: estimateCostUsd(tokensIn, tokensOut, this.config)
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("INTERNAL_ERROR", 504, "xAI request timed out");
      }
      throw new AppError(
        "INTERNAL_ERROR",
        502,
        error instanceof Error ? error.message : "xAI network error"
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createAiProvider(
  config: AiRuntimeConfig = loadAiConfig(),
  fetchImpl: AiFetch = fetch
): AiProvider {
  if (config.mode === "xai") {
    return new XaiAiProvider(config, fetchImpl);
  }
  return new MockAiProvider();
}
