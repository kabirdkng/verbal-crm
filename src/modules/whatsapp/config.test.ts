import { describe, expect, it } from "vitest";
import { loadWhatsAppConfig, resolveOrganizationId } from "@/modules/whatsapp/config";

describe("WhatsApp config", () => {
  it("maps phone_number_id to organization", () => {
    const config = loadWhatsAppConfig({
      WHATSAPP_PHONE_NUMBER_MAP: JSON.stringify({
        "10987654321": "org_a",
        "10999999999": "org_b"
      }),
      WHATSAPP_DEFAULT_ORGANIZATION_ID: "org_fallback"
    } as NodeJS.ProcessEnv);

    expect(
      resolveOrganizationId({
        config,
        phoneNumberId: "10987654321"
      })
    ).toBe("org_a");

    expect(
      resolveOrganizationId({
        config,
        phoneNumberId: "unknown",
        organizationIdHeader: "org_header"
      })
    ).toBe("org_header");

    expect(
      resolveOrganizationId({
        config,
        phoneNumberId: null
      })
    ).toBe("org_fallback");
  });

  it("requires signature in production by default", () => {
    const config = loadWhatsAppConfig({
      NODE_ENV: "production",
      WHATSAPP_APP_SECRET: ""
    } as NodeJS.ProcessEnv);
    expect(config.requireSignature).toBe(true);
    expect(config.inlineDrain).toBe(false);
  });
});
