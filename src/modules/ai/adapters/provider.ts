import { AppError } from "@/lib/errors";
import {
  estimateCostUsd,
  loadAiConfig,
  type AiRuntimeConfig
} from "@/modules/ai/config";
import type { AiAction, AiTone } from "@/modules/ai/contracts";

export type AssistInput = {
  organizationId: string;
  conversationId: string;
  action: AiAction;
  tone: AiTone;
  recentMessages: Array<{ direction: "inbound" | "outbound"; body: string }>;
  contactName?: string;
  draft?: string;
  instruction?: string;
  language?: string;
};

export type AssistResult = {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
};

/** @deprecated use AssistInput */
export type SuggestReplyInput = {
  organizationId: string;
  conversationId: string;
  recentMessages: Array<{ direction: "inbound" | "outbound"; body: string }>;
  contactName?: string;
};

/** @deprecated use AssistResult */
export type SuggestReplyResult = {
  suggestion: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
};

export interface AiProvider {
  assist(input: AssistInput): Promise<AssistResult>;
  /** Backward-compatible wrapper. */
  suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult>;
}

export type AiFetch = typeof fetch;

function toneHint(tone: AiTone): string {
  switch (tone) {
    case "friendly":
      return "Use a warm, approachable tone.";
    case "empathetic":
      return "Acknowledge feelings and show genuine empathy.";
    case "concise":
      return "Be very concise — short sentences, minimal fluff.";
    case "formal":
      return "Use formal business language.";
    default:
      return "Use a clear, professional tone.";
  }
}

function actionInstructions(input: AssistInput): { system: string; user: string } {
  const name = input.contactName ?? "the customer";
  const history = input.recentMessages
    .map((message) => {
      const who = message.direction === "inbound" ? "Customer" : "Agent";
      return `${who}: ${message.body}`;
    })
    .join("\n");

  const baseSystem = [
    "You are an AI copilot for WhatsApp CRM agents (admin, manager, and agent roles).",
    "Help the human agent work faster without inventing facts, order IDs, policies, or promises.",
    toneHint(input.tone),
    input.instruction ? `Extra guidance: ${input.instruction}` : null
  ]
    .filter(Boolean)
    .join(" ");

  switch (input.action) {
    case "improve_draft":
      return {
        system: `${baseSystem} Rewrite the agent's draft to be clearer and more effective. Return only the improved message text.`,
        user: [
          `Customer name: ${name}`,
          "Conversation:",
          history || "(no messages yet)",
          "",
          "Draft to improve:",
          input.draft ?? "(empty draft)",
          "",
          "Improved reply:"
        ].join("\n")
      };
    case "summarize":
      return {
        system: `${baseSystem} Summarize the conversation for an agent handoff. Use short bullets: context, customer need, what was already done, open questions. Return plain text only.`,
        user: [
          `Customer name: ${name}`,
          "Conversation:",
          history || "(no messages yet)",
          "",
          "Handoff summary:"
        ].join("\n")
      };
    case "next_steps":
      return {
        system: `${baseSystem} Suggest 3 concrete next steps the agent should take. Number them. Be practical. Return plain text only.`,
        user: [
          `Customer name: ${name}`,
          "Conversation:",
          history || "(no messages yet)",
          "",
          "Recommended next steps:"
        ].join("\n")
      };
    case "translate":
      return {
        system: `${baseSystem} Translate the agent message (or last outbound intent) into the target language. Return only the translated text.`,
        user: [
          `Target language: ${input.language ?? "Spanish"}`,
          `Customer name: ${name}`,
          "Conversation:",
          history || "(no messages yet)",
          "",
          "Text to translate:",
          input.draft || input.recentMessages.at(-1)?.body || "(nothing)",
          "",
          "Translation:"
        ].join("\n")
      };
    case "suggest_reply":
    default:
      return {
        system: `${baseSystem} Draft a concise agent reply ready to send on WhatsApp. Under 120 words. Return only the reply text.`,
        user: [
          `Customer name: ${name}`,
          "Conversation:",
          history || "(no messages yet)",
          "",
          "Draft the next agent reply:"
        ].join("\n")
      };
  }
}

/** Deterministic local provider for tests and zero-config demos. */
export class MockAiProvider implements AiProvider {
  async assist(input: AssistInput): Promise<AssistResult> {
    const lastInbound = [...input.recentMessages]
      .reverse()
      .find((message) => message.direction === "inbound");
    const name = input.contactName ?? "there";
    const topic = lastInbound?.body?.slice(0, 80) ?? "your message";

    let text: string;
    switch (input.action) {
      case "improve_draft":
        text = `Hi ${name}, ${input.draft?.trim() || `thanks for reaching out about "${topic}".`} Let me know if you need anything else.`;
        break;
      case "summarize":
        text = [
          `• Customer: ${name}`,
          `• Topic: ${topic}`,
          `• Messages in window: ${input.recentMessages.length}`,
          "• Open: clarify need and resolve promptly",
          "• Tone: " + input.tone
        ].join("\n");
        break;
      case "next_steps":
        text = [
          "1. Confirm the customer's goal in one short question.",
          "2. Check account/order context in CRM notes.",
          "3. Send a clear resolution or next SLA update."
        ].join("\n");
        break;
      case "translate":
        text = `[${input.language ?? "es"}] ${input.draft || `Hola ${name}, gracias por escribirnos sobre "${topic}".`}`;
        break;
      case "suggest_reply":
      default:
        text = `Hi ${name}, thanks for reaching out about "${topic}". Happy to help — could you share a bit more detail so we can resolve this quickly?`;
    }

    const tokensIn = Math.max(20, JSON.stringify(input.recentMessages).length / 4);
    const tokensOut = Math.max(15, text.length / 4);

    return {
      text,
      model: "mock-assist-v1",
      tokensIn: Math.round(tokensIn),
      tokensOut: Math.round(tokensOut),
      estimatedCostUsd: Number(((tokensIn + tokensOut) * 0.000002).toFixed(6))
    };
  }

  async suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult> {
    const result = await this.assist({
      ...input,
      action: "suggest_reply",
      tone: "professional"
    });
    return {
      suggestion: result.text,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCostUsd: result.estimatedCostUsd
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

  async assist(input: AssistInput): Promise<AssistResult> {
    if (!this.config.apiKey) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "XAI_API_KEY is not configured for AI_MODE=xai"
      );
    }

    const prompts = actionInstructions(input);
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
          temperature: input.action === "summarize" ? 0.2 : 0.4,
          max_tokens: this.config.maxTokens,
          messages: [
            { role: "system", content: prompts.system },
            { role: "user", content: prompts.user }
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

      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new AppError("INTERNAL_ERROR", 502, "xAI returned empty suggestion");
      }

      const tokensIn = json.usage?.prompt_tokens ?? Math.ceil(prompts.user.length / 4);
      const tokensOut = json.usage?.completion_tokens ?? Math.ceil(text.length / 4);

      return {
        text,
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

  async suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult> {
    const result = await this.assist({
      ...input,
      action: "suggest_reply",
      tone: "professional"
    });
    return {
      suggestion: result.text,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCostUsd: result.estimatedCostUsd
    };
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
