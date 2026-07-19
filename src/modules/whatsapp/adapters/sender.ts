import { createId } from "@/lib/ids";

export type SendTextInput = {
  organizationId: string;
  to: string;
  body: string;
  templateName?: string | null;
};

export type SendTextResult = {
  providerMessageId: string;
  status: "queued" | "sent" | "failed";
};

export interface WhatsAppSender {
  sendText(input: SendTextInput): Promise<SendTextResult>;
}

/** Phase 1 mock sender — replace with Meta Graph API adapter in production. */
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
