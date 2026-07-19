import { describe, expect, it } from "vitest";
import { estimateCostUsd, loadAiConfig } from "@/modules/ai/config";

describe("AI config", () => {
  it("defaults to mock mode", () => {
    const config = loadAiConfig({} as NodeJS.ProcessEnv);
    expect(config.mode).toBe("mock");
    expect(config.model).toBe("grok-4.5");
  });

  it("enables xai mode and pricing", () => {
    const config = loadAiConfig({
      AI_MODE: "xai",
      XAI_API_KEY: "key",
      XAI_MODEL: "grok-4.5",
      XAI_INPUT_USD_PER_1M: "2",
      XAI_OUTPUT_USD_PER_1M: "6"
    } as NodeJS.ProcessEnv);
    expect(config.mode).toBe("xai");
    expect(estimateCostUsd(1_000_000, 1_000_000, config)).toBe(8);
  });
});
