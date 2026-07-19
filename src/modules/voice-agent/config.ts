export type VapiRuntimeConfig = {
  mode: "mock" | "vapi";
  apiKey?: string;
  baseUrl: string;
  phoneNumberId?: string;
  /** Optional shared assistant id when tenants do not use transient assistants */
  assistantId?: string;
  webhookSecret?: string;
  timeoutMs: number;
};

export function loadVapiConfig(
  env: NodeJS.ProcessEnv = process.env
): VapiRuntimeConfig {
  const mode = env.VAPI_MODE === "vapi" ? "vapi" : "mock";
  return {
    mode,
    apiKey: env.VAPI_API_KEY || undefined,
    baseUrl: (env.VAPI_BASE_URL ?? "https://api.vapi.ai").replace(/\/$/, ""),
    phoneNumberId: env.VAPI_PHONE_NUMBER_ID || undefined,
    assistantId: env.VAPI_ASSISTANT_ID || undefined,
    webhookSecret: env.VAPI_WEBHOOK_SECRET || undefined,
    timeoutMs: Number(env.VAPI_TIMEOUT_MS ?? "60000")
  };
}
