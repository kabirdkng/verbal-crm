export type AiMode = "mock" | "xai";

export type AiRuntimeConfig = {
  mode: AiMode;
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
  /** USD per 1M input tokens */
  inputUsdPer1M: number;
  /** USD per 1M output tokens */
  outputUsdPer1M: number;
  timeoutMs: number;
  maxTokens: number;
};

export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): AiRuntimeConfig {
  const mode = (env.AI_MODE === "xai" ? "xai" : "mock") as AiMode;
  return {
    mode,
    apiKey: env.XAI_API_KEY,
    baseUrl: (env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/$/, ""),
    model: env.XAI_MODEL ?? "grok-4.5",
    // grok-4.5 short-context list prices (docs.x.ai)
    inputUsdPer1M: Number(env.XAI_INPUT_USD_PER_1M ?? "2"),
    outputUsdPer1M: Number(env.XAI_OUTPUT_USD_PER_1M ?? "6"),
    timeoutMs: Number(env.XAI_TIMEOUT_MS ?? "60000"),
    maxTokens: Number(env.XAI_MAX_TOKENS ?? "512")
  };
}

export function estimateCostUsd(
  tokensIn: number,
  tokensOut: number,
  config: AiRuntimeConfig
): number {
  const cost =
    (tokensIn / 1_000_000) * config.inputUsdPer1M +
    (tokensOut / 1_000_000) * config.outputUsdPer1M;
  return Number(cost.toFixed(6));
}
