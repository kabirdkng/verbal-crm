import { describe, expect, it, vi } from "vitest";
import { XaiAiProvider } from "@/modules/ai/adapters/provider";
import type { AiRuntimeConfig } from "@/modules/ai/config";

function config(overrides: Partial<AiRuntimeConfig> = {}): AiRuntimeConfig {
  return {
    mode: "xai",
    apiKey: "xai-test-key",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4.5",
    inputUsdPer1M: 2,
    outputUsdPer1M: 6,
    timeoutMs: 5000,
    maxTokens: 256,
    ...overrides
  };
}

describe("XaiAiProvider", () => {
  it("calls chat completions and maps usage", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: "grok-4.5",
          choices: [{ message: { content: "Thanks for your note — happy to help." } }],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const provider = new XaiAiProvider(config(), fetchImpl);
    const result = await provider.suggestReply({
      organizationId: "org_a",
      conversationId: "cv_1",
      contactName: "Alex",
      recentMessages: [{ direction: "inbound", body: "I need help with billing" }]
    });

    expect(result.suggestion).toContain("happy to help");
    expect(result.model).toBe("grok-4.5");
    expect(result.tokensIn).toBe(100);
    expect(result.tokensOut).toBe(20);
    // 100/1e6*2 + 20/1e6*6 = 0.0002 + 0.00012 = 0.00032
    expect(result.estimatedCostUsd).toBe(0.00032);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer xai-test-key"
    });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("grok-4.5");
    expect(body.messages[0].role).toBe("system");
  });

  it("throws when API key is missing", async () => {
    const provider = new XaiAiProvider(config({ apiKey: undefined }));
    await expect(
      provider.suggestReply({
        organizationId: "org_a",
        conversationId: "cv_1",
        recentMessages: []
      })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
  });

  it("maps Graph/API errors to AppError 502", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { message: "Invalid API key" } }), {
        status: 401
      });
    }) as unknown as typeof fetch;

    const provider = new XaiAiProvider(config(), fetchImpl);
    await expect(
      provider.suggestReply({
        organizationId: "org_a",
        conversationId: "cv_1",
        recentMessages: [{ direction: "inbound", body: "hi" }]
      })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 502 });
  });
});
