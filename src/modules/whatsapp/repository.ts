import { createId } from "@/lib/ids";
import { getStore, type WebhookEventRecord, type WebhookEventStatus } from "@/lib/store";

export type CreateWebhookEventInput = {
  organizationId: string | null;
  providerEventId: string;
  payload: unknown;
  status: WebhookEventStatus;
};

export interface WebhookEventsRepository {
  findByProviderEventId(providerEventId: string): Promise<WebhookEventRecord | null>;
  create(input: CreateWebhookEventInput): Promise<WebhookEventRecord>;
  updateStatus(
    id: string,
    status: WebhookEventStatus,
    errorMessage?: string | null
  ): Promise<void>;
}

export class InMemoryWebhookEventsRepository implements WebhookEventsRepository {
  async findByProviderEventId(providerEventId: string): Promise<WebhookEventRecord | null> {
    return (
      getStore().webhookEvents.find((item) => item.providerEventId === providerEventId) ?? null
    );
  }

  async create(input: CreateWebhookEventInput): Promise<WebhookEventRecord> {
    const record: WebhookEventRecord = {
      id: createId("wh"),
      organizationId: input.organizationId,
      provider: "whatsapp",
      providerEventId: input.providerEventId,
      status: input.status,
      payload: input.payload,
      errorMessage: null,
      createdAt: new Date(),
      processedAt: null
    };
    getStore().webhookEvents.push(record);
    return record;
  }

  async updateStatus(
    id: string,
    status: WebhookEventStatus,
    errorMessage: string | null = null
  ): Promise<void> {
    const record = getStore().webhookEvents.find((item) => item.id === id);
    if (!record) {
      return;
    }
    record.status = status;
    record.errorMessage = errorMessage;
    if (status === "processed" || status === "failed") {
      record.processedAt = new Date();
    }
  }
}
