import { createId } from "@/lib/ids";
import {
  loadWhatsAppConfig,
  resolvePhoneNumberId,
  type WhatsAppRuntimeConfig
} from "@/modules/whatsapp/config";

export type SendTextInput = {
  organizationId: string;
  to: string;
  body: string;
  templateName?: string | null;
  templateLanguage?: string | null;
};

export type SendTextResult = {
  providerMessageId: string;
  status: "queued" | "sent" | "failed";
  errorMessage?: string;
};

export interface WhatsAppSender {
  sendText(input: SendTextInput): Promise<SendTextResult>;
}

/** Local/dev mock sender — no network calls. */
export class MockWhatsAppSender implements WhatsAppSender {
  readonly sent: SendTextInput[] = [];

  async sendText(input: SendTextInput): Promise<SendTextResult> {
    this.sent.push(input);
    return {
      providerMessageId: createId("wamid"),
      status: "sent"
    };
  }
}

export type GraphFetch = typeof fetch;

/**
 * Meta WhatsApp Cloud API sender.
 * Docs: POST /{phone-number-id}/messages
 */
export class MetaGraphWhatsAppSender implements WhatsAppSender {
  constructor(
    private readonly config: WhatsAppRuntimeConfig = loadWhatsAppConfig(),
    private readonly fetchImpl: GraphFetch = fetch
  ) {}

  async sendText(input: SendTextInput): Promise<SendTextResult> {
    if (!this.config.accessToken) {
      return {
        providerMessageId: createId("wamid_fail"),
        status: "failed",
        errorMessage: "WHATSAPP_ACCESS_TOKEN is not configured"
      };
    }

    let phoneNumberId: string;
    try {
      phoneNumberId = resolvePhoneNumberId(this.config, input.organizationId);
    } catch (error) {
      return {
        providerMessageId: createId("wamid_fail"),
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Phone number mapping missing"
      };
    }

    const to = input.to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/${this.config.apiVersion}/${phoneNumberId}/messages`;

    const body = input.templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.templateLanguage ?? "en" }
          }
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: false, body: input.body }
        };

    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const json = (await response.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        return {
          providerMessageId: createId("wamid_fail"),
          status: "failed",
          errorMessage: json.error?.message ?? `Graph API ${response.status}`
        };
      }

      return {
        providerMessageId: json.messages?.[0]?.id ?? createId("wamid"),
        status: "sent"
      };
    } catch (error) {
      return {
        providerMessageId: createId("wamid_fail"),
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Graph API network error"
      };
    }
  }
}

export function createWhatsAppSender(
  config: WhatsAppRuntimeConfig = loadWhatsAppConfig(),
  fetchImpl: GraphFetch = fetch
): WhatsAppSender {
  if (config.mode === "meta") {
    return new MetaGraphWhatsAppSender(config, fetchImpl);
  }
  return new MockWhatsAppSender();
}
