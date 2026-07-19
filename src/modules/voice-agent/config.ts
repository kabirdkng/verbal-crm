export type VapiRuntimeConfig = {
  mode: "mock" | "vapi";
  apiKey?: string;
  baseUrl: string;
  phoneNumberId?: string;
  /** Optional shared assistant id when tenants do not use transient assistants */
  assistantId?: string;
  webhookSecret?: string;
  timeoutMs: number;
  /**
   * Map Vapi phoneNumberId → organizationId for multi-tenant inbound routing.
   * JSON: {"phone_num_id_1":"org_demo"}
   */
  phoneNumberMap: Record<string, string>;
  /** Default org when only one tenant / demo (inbound fallback). */
  defaultOrganizationId?: string;
};

export function loadVapiConfig(
  env: NodeJS.ProcessEnv = process.env
): VapiRuntimeConfig {
  const mode = env.VAPI_MODE === "vapi" ? "vapi" : "mock";
  let phoneNumberMap: Record<string, string> = {};
  if (env.VAPI_PHONE_NUMBER_MAP) {
    try {
      phoneNumberMap = JSON.parse(env.VAPI_PHONE_NUMBER_MAP) as Record<string, string>;
    } catch {
      phoneNumberMap = {};
    }
  }
  return {
    mode,
    apiKey: env.VAPI_API_KEY || undefined,
    baseUrl: (env.VAPI_BASE_URL ?? "https://api.vapi.ai").replace(/\/$/, ""),
    phoneNumberId: env.VAPI_PHONE_NUMBER_ID || undefined,
    assistantId: env.VAPI_ASSISTANT_ID || undefined,
    webhookSecret: env.VAPI_WEBHOOK_SECRET || undefined,
    timeoutMs: Number(env.VAPI_TIMEOUT_MS ?? "60000"),
    phoneNumberMap,
    defaultOrganizationId:
      env.VAPI_DEFAULT_ORGANIZATION_ID || env.WHATSAPP_DEFAULT_ORGANIZATION_ID || "org_demo"
  };
}

/** Resolve tenant org from Vapi phone number id (inbound routing). */
export function resolveOrgFromVapiPhoneNumberId(
  config: VapiRuntimeConfig,
  phoneNumberId: string | undefined | null,
  tenantPhoneToOrg?: Map<string, string>
): string | null {
  if (!phoneNumberId) {
    return config.defaultOrganizationId ?? null;
  }
  if (tenantPhoneToOrg?.has(phoneNumberId)) {
    return tenantPhoneToOrg.get(phoneNumberId)!;
  }
  if (config.phoneNumberMap[phoneNumberId]) {
    return config.phoneNumberMap[phoneNumberId]!;
  }
  // Platform single-number → default org
  if (config.phoneNumberId && config.phoneNumberId === phoneNumberId) {
    return config.defaultOrganizationId ?? null;
  }
  return config.defaultOrganizationId ?? null;
}
