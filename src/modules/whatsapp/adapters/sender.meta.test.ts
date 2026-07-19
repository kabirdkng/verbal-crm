import { describe, expect, it, vi } from "vitest";
import { MetaGraphWhatsAppSender } from "@/modules/whatsapp/adapters/sender";
import type { WhatsAppRuntimeConfig } from "@/modules/whatsapp/config";

function config(overrides: Partial<WhatsAppRuntimeConfig> = {}): WhatsAppRuntimeConfig {
  return {
    mode: "meta",
    accessToken: "token",
    apiVersion: "v21.0",
    defaultPhoneNumberId: "phone_1",
    phoneNumberToOrg: new Map([["phone_1", "org_demo"]]),
    orgToPhoneNumber: new Map([["org_demo", "phone_1"]]),
    appSecret: "secret",
    requireSignature: true,
    verifyToken: "verify",
    defaultOrganizationId: "org_demo",
    inlineDrain: false,
    ...overrides
  };
}

describe("MetaGraphWhatsAppSender", () => {
  it("sends free-form text via Graph API", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ messages: [{ id: "wamid.graph.1" }] }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const sender = new MetaGraphWhatsAppSender(config(), fetchImpl);
    const result = await sender.sendText({
      organizationId: "org_demo",
      to: "+15551234567",
      body: "Hello from Verbal"
    });

    expect(result.status).toBe("sent");
    expect(result.providerMessageId).toBe("wamid.graph.1");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v21.0/phone_1/messages");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.type).toBe("text");
    expect(body.to).toBe("15551234567");
  });

  it("sends template messages outside free-form", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ messages: [{ id: "wamid.tpl.1" }] }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const sender = new MetaGraphWhatsAppSender(config(), fetchImpl);
    const result = await sender.sendText({
      organizationId: "org_demo",
      to: "15557654321",
      body: "ignored when template set",
      templateName: "welcome_followup",
      templateLanguage: "en"
    });

    expect(result.status).toBe("sent");
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("welcome_followup");
  });

  it("returns failed when Graph API errors", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { message: "Invalid OAuth" } }), {
        status: 401
      });
    }) as unknown as typeof fetch;

    const sender = new MetaGraphWhatsAppSender(config(), fetchImpl);
    const result = await sender.sendText({
      organizationId: "org_demo",
      to: "15551234567",
      body: "x"
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("Invalid OAuth");
  });
});
