import type { JobQueue } from "@/lib/queue";
import { AppError } from "@/lib/errors";
import {
  WhatsAppWebhookPayloadSchema,
  type WhatsAppWebhookPayload
} from "@/modules/whatsapp/contracts";
import type { SignatureValidator } from "@/modules/whatsapp/adapters/signature";
import type { WebhookEventsRepository } from "@/modules/whatsapp/repository";

export type InboundMessageJobPayload = {
  organizationId: string;
  providerMessageId: string;
  from: string;
  body: string;
  profileName?: string;
  webhookEventId: string;
};

export type WebhookIngestResult = {
  accepted: boolean;
  duplicate: boolean;
  eventId: string | null;
  jobId: string | null;
};

const DEFAULT_ORG = process.env.WHATSAPP_DEFAULT_ORGANIZATION_ID ?? "org_demo";

export class WhatsAppIngestService {
  constructor(
    private readonly webhookEvents: WebhookEventsRepository,
    private readonly queue: JobQueue,
    private readonly signatureValidator: SignatureValidator
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

    const messages = this.extractMessages(parsed.data);
    if (messages.length === 0) {
      return { accepted: true, duplicate: false, eventId: null, jobId: null };
    }

    // Phase 1 processes first text message in payload (Meta can batch).
    const message = messages[0]!;
    const organizationId =
      organizationIdHeader ||
      parsed.data.organizationId ||
      DEFAULT_ORG;

    const existing = await this.webhookEvents.findByProviderEventId(message.id);
    if (existing) {
      await this.webhookEvents.updateStatus(existing.id, "duplicate");
      return {
        accepted: true,
        duplicate: true,
        eventId: existing.id,
        jobId: null
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
        webhookEventId: event.id
      } satisfies InboundMessageJobPayload
    });

    await this.webhookEvents.updateStatus(event.id, "queued");

    return {
      accepted: true,
      duplicate: false,
      eventId: event.id,
      jobId: job.id
    };
  }

  private extractMessages(payload: WhatsAppWebhookPayload): Array<{
    id: string;
    from: string;
    text?: { body: string };
    profileName?: string;
  }> {
    if (payload.message) {
      return [
        {
          id: payload.message.id,
          from: payload.message.from,
          text: payload.message.text,
          profileName: payload.message.profileName
        }
      ];
    }

    const results: Array<{
      id: string;
      from: string;
      text?: { body: string };
      profileName?: string;
    }> = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
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

    return results;
  }
}
