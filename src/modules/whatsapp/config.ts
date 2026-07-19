export type WhatsAppMode = "mock" | "meta";

export type WhatsAppChannelBinding = {
  phoneNumberId: string;
  organizationId: string;
};

export type WhatsAppRuntimeConfig = {
  mode: WhatsAppMode;
  accessToken: string | undefined;
  apiVersion: string;
  defaultPhoneNumberId: string | undefined;
  /** phone_number_id → organizationId */
  phoneNumberToOrg: Map<string, string>;
  /** organizationId → phone_number_id */
  orgToPhoneNumber: Map<string, string>;
  appSecret: string | undefined;
  requireSignature: boolean;
  verifyToken: string;
  defaultOrganizationId: string;
  /** Drain queue inside webhook POST (local only). */
  inlineDrain: boolean;
};

function parsePhoneNumberMap(raw: string | undefined): WhatsAppChannelBinding[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.entries(parsed).map(([phoneNumberId, organizationId]) => ({
      phoneNumberId,
      organizationId
    }));
  } catch {
    throw new Error("WHATSAPP_PHONE_NUMBER_MAP must be valid JSON object");
  }
}

export function loadWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env
): WhatsAppRuntimeConfig {
  const mode = (env.WHATSAPP_MODE === "meta" ? "meta" : "mock") as WhatsAppMode;
  const bindings = parsePhoneNumberMap(env.WHATSAPP_PHONE_NUMBER_MAP);
  const phoneNumberToOrg = new Map<string, string>();
  const orgToPhoneNumber = new Map<string, string>();

  for (const binding of bindings) {
    phoneNumberToOrg.set(binding.phoneNumberId, binding.organizationId);
    orgToPhoneNumber.set(binding.organizationId, binding.phoneNumberId);
  }

  const defaultPhoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const defaultOrganizationId = env.WHATSAPP_DEFAULT_ORGANIZATION_ID ?? "org_demo";
  if (defaultPhoneNumberId && !phoneNumberToOrg.has(defaultPhoneNumberId)) {
    phoneNumberToOrg.set(defaultPhoneNumberId, defaultOrganizationId);
    orgToPhoneNumber.set(defaultOrganizationId, defaultPhoneNumberId);
  }

  const requireSignature =
    env.WHATSAPP_REQUIRE_SIGNATURE === "true" ||
    (env.NODE_ENV === "production" && env.WHATSAPP_REQUIRE_SIGNATURE !== "false");

  const inlineDrain =
    env.WHATSAPP_INLINE_DRAIN === "true" ||
    (env.WHATSAPP_INLINE_DRAIN !== "false" && env.NODE_ENV !== "production");

  return {
    mode,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0",
    defaultPhoneNumberId,
    phoneNumberToOrg,
    orgToPhoneNumber,
    appSecret: env.WHATSAPP_APP_SECRET,
    requireSignature,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? "verbal-crm-dev",
    defaultOrganizationId,
    inlineDrain
  };
}

export function resolveOrganizationId(input: {
  config: WhatsAppRuntimeConfig;
  phoneNumberId?: string | null;
  organizationIdHeader?: string | null;
  payloadOrganizationId?: string | null;
}): string {
  if (input.phoneNumberId) {
    const mapped = input.config.phoneNumberToOrg.get(input.phoneNumberId);
    if (mapped) {
      return mapped;
    }
  }
  if (input.organizationIdHeader) {
    return input.organizationIdHeader;
  }
  if (input.payloadOrganizationId) {
    return input.payloadOrganizationId;
  }
  return input.config.defaultOrganizationId;
}

export function resolvePhoneNumberId(
  config: WhatsAppRuntimeConfig,
  organizationId: string
): string {
  const mapped = config.orgToPhoneNumber.get(organizationId);
  if (mapped) {
    return mapped;
  }
  if (config.defaultPhoneNumberId) {
    return config.defaultPhoneNumberId;
  }
  throw new Error(
    `No WhatsApp phone_number_id configured for organization ${organizationId}`
  );
}
