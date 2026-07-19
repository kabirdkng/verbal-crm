import { getPrisma } from "@/lib/prisma";
import type { WebhookEventRecord, WebhookEventStatus } from "@/lib/store";
import type {
  CreateWebhookEventInput,
  WebhookEventsRepository
} from "@/modules/whatsapp/repository";

export class PrismaWebhookEventsRepository implements WebhookEventsRepository {
  async findByProviderEventId(providerEventId: string): Promise<WebhookEventRecord | null> {
    const row = await getPrisma().webhookEvent.findUnique({
      where: { providerEventId }
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      organizationId: row.organizationId,
      provider: "whatsapp",
      providerEventId: row.providerEventId,
      status: row.status as WebhookEventStatus,
      payload: row.payload,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      processedAt: row.processedAt
    };
  }

  async create(input: CreateWebhookEventInput): Promise<WebhookEventRecord> {
    const row = await getPrisma().webhookEvent.create({
      data: {
        organizationId: input.organizationId,
        provider: "whatsapp",
        providerEventId: input.providerEventId,
        status: input.status,
        payload: input.payload as object
      }
    });
    return {
      id: row.id,
      organizationId: row.organizationId,
      provider: "whatsapp",
      providerEventId: row.providerEventId,
      status: row.status as WebhookEventStatus,
      payload: row.payload,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      processedAt: row.processedAt
    };
  }

  async updateStatus(
    id: string,
    status: WebhookEventStatus,
    errorMessage: string | null = null
  ): Promise<void> {
    await getPrisma().webhookEvent.update({
      where: { id },
      data: {
        status,
        errorMessage,
        processedAt:
          status === "processed" || status === "failed" ? new Date() : undefined
      }
    });
  }
}
