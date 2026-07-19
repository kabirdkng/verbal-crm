import type { JobQueue } from "@/lib/queue";
import { AppError } from "@/lib/errors";
import {
  WhatsAppWebhookPayloadSchema,
  type WhatsAppWebhookPayload
} from "@/modules/whatsapp/contracts";
import type { SignatureValidator } from "@/modules/whatsapp/adapters/signature";
import type { WebhookEventsRepository } from "@/modules/whatsapp/repository";
import {
  loadWhatsAppConfig,
  resolveOrganizationId,
  type WhatsAppRuntimeConfig
} from "@/modules/whatsapp/config";

export type InboundMessageJobPayload = {
  organizationId: string;
  providerMessageId: string;
  from: string;
  body: string;
  profileName?: string;
  phoneNumberId?: string;
  webhookEventId: string;
};

export type WebhookIngestResult = {
  accepted: boolean;
  duplicate: boolean;
  eventId: string | null;
  jobId: string | null;
  organizationId?: string;
};

export class WhatsAppIngestService {
  constructor(
    private readonly webhookEvents: WebhookEventsRepository,
    private readonly queue: JobQueue,
    private readonly signatureValidator: SignatureValidator,
    private readonly config: WhatsAppRuntimeConfig = loadWhatsAppConfig()
  ) {}

  async ingest(
    rawBody: string,
    payload: unknown,
    signatureHeader: string | null,
    organizationIdHeader: string | null
  ): Promise<WebhookIngestResult> {
    if (!this.signatureValidator.validate(rawBody, signatureHeader)) {
      throw new AppError("FORBIDDEN", 403, "Invalid webhook signature");
    }

    const parsed = WhatsAppWebhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid WhatsApp webhook payload",
        parsed.error.flatten()
      );
    }

    const extracted = this.extractInbound(parsed.data);
    if (extracted.messages.length === 0) {
      return { accepted: true, duplicate: false, eventId: null, jobId: null };
    }

    // Process first text message (Meta can batch multiple).
    const message = extracted.messages[0]!;
    const organizationId = resolveOrganizationId({
      config: this.config,
      phoneNumberId: extracted.phoneNumberId,
      organizationIdHeader,
      payloadOrganizationId: parsed.data.organizationId
    });

    const existing = await this.webhookEvents.findByProviderEventId(message.id);
    if (existing) {
      await this.webhookEvents.updateStatus(existing.id, "duplicate");
      return {
        accepted: true,
        duplicate: true,
        eventId: existing.id,
        jobId: null,
        organizationId
      };
    }

    const event = await this.webhookEvents.create({
      organizationId,
      providerEventId: message.id,
      payload,
      status: "received"
    });

    const job = await this.queue.enqueue({
      type: "whatsapp.inbound_message",
      payload: {
        organizationId,
        providerMessageId: message.id,
        from: message.from,
        body: message.text?.body ?? "",
        profileName: message.profileName,
        phoneNumberId: extracted.phoneNumberId,
        webhookEventId: event.id
      } satisfies InboundMessageJobPayload
    });

    await this.webhookEvents.updateStatus(event.id, "queued");

    return {
      accepted: true,
      duplicate: false,
      eventId: event.id,
      jobId: job.id,
      organizationId
    };
  }

  private extractInbound(payload: WhatsAppWebhookPayload): {
    phoneNumberId?: string;
    messages: Array<{
      id: string;
      from: string;
      text?: { body: string };
      profileName?: string;
    }>;
  } {
    if (payload.message) {
      return {
        messages: [
          {
            id: payload.message.id,
            from: payload.message.from,
            text: payload.message.text,
            profileName: payload.message.profileName
          }
        ]
      };
    }

    let phoneNumberId: string | undefined;
    const results: Array<{
      id: string;
      from: string;
      text?: { body: string };
      profileName?: string;
    }> = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        phoneNumberId =
          phoneNumberId ?? change.value.metadata?.phone_number_id ?? undefined;
        const profileName = change.value.contacts?.[0]?.profile?.name;
        for (const message of change.value.messages ?? []) {
          if (!message.text?.body) {
            continue;
          }
          results.push({
            id: message.id,
            from: message.from,
            text: message.text,
            profileName
          });
        }
      }
    }

    return { phoneNumberId, messages: results };
  }
}
