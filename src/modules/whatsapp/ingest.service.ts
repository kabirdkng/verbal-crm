import type { JobQueue } from "@/lib/queue";
import { AppError } from "@/lib/errors";
import type { CallingService } from "@/modules/calling/service";
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
    private readonly config: WhatsAppRuntimeConfig = loadWhatsAppConfig(),
    private readonly callingService?: CallingService
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

    // Voice calling webhooks (field=calls) — update call records, no message job.
    const callHandled = await this.handleCallEvents(
      parsed.data,
      organizationIdHeader
    );
    if (callHandled) {
      return {
        accepted: true,
        duplicate: false,
        eventId: null,
        jobId: null,
        organizationId: callHandled
      };
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

  /**
   * Handle Cloud API "calls" field webhooks.
   * Returns organizationId when a call event was processed.
   */
  private async handleCallEvents(
    payload: WhatsAppWebhookPayload,
    organizationIdHeader: string | null
  ): Promise<string | null> {
    if (!this.callingService) {
      return null;
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const field = change.field;
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        const organizationId = resolveOrganizationId({
          config: this.config,
          phoneNumberId,
          organizationIdHeader,
          payloadOrganizationId: payload.organizationId
        });

        const hasCalls = Array.isArray(value.calls) && value.calls.length > 0;
        const callStatuses = (value.statuses ?? []).filter(
          (s) => !s.type || s.type === "call"
        );
        const hasCallStatuses = callStatuses.length > 0 && (field === "calls" || hasCalls);

        if (!hasCalls && !hasCallStatuses && field !== "calls") {
          continue;
        }

        for (const call of value.calls ?? []) {
          if (!call.id) continue;
          const statusVal = Array.isArray(call.status)
            ? call.status[0]
            : call.status;
          await this.callingService.handleProviderEvent({
            organizationId,
            providerCallId: call.id,
            event: call.event ?? "connect",
            status: statusVal,
            direction: call.direction,
            phone: call.from ?? call.to,
            answerSdp: call.session?.sdp ?? null,
            durationSeconds: call.duration ?? null,
            startTime: call.start_time
              ? new Date(Number(call.start_time) * 1000)
              : null,
            endTime: call.end_time ? new Date(Number(call.end_time) * 1000) : null
          });
        }

        for (const status of callStatuses) {
          if (!status.id || status.type === "message") continue;
          if (status.type && status.type !== "call") continue;
          await this.callingService.handleProviderEvent({
            organizationId,
            providerCallId: status.id,
            event: "status",
            status: status.status,
            phone: status.recipient_id
          });
        }

        return organizationId;
      }
    }

    return null;
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
