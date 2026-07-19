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
