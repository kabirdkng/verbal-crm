import { getDb } from "@/lib/prisma";
import type { Message, MessageStatus, MessageDirection, MessageChannel } from "@/modules/messages/domain";
import type { CreateMessageInput, MessagesRepository } from "@/modules/messages/repository";

function toDomain(row: {
  id: string;
  organizationId: string;
  conversationId: string;
  contactId: string;
  direction: string;
  channel: string;
  body: string;
  status: string;
  providerMessageId: string | null;
  templateName: string | null;
  createdAt: Date;
  createdByUserId: string | null;
}): Message {
  return {
    id: row.id,
    organizationId: row.organizationId,
    conversationId: row.conversationId,
    contactId: row.contactId,
    direction: row.direction as MessageDirection,
    channel: row.channel as MessageChannel,
    body: row.body,
    status: row.status as MessageStatus,
    providerMessageId: row.providerMessageId,
    templateName: row.templateName,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId
  };
}

export class PrismaMessagesRepository implements MessagesRepository {
  async create(input: CreateMessageInput): Promise<Message> {
    const row = await getDb().message.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        contactId: input.contactId,
        direction: input.direction,
        channel: input.channel ?? "whatsapp",
        body: input.body,
        status: input.status,
        providerMessageId: input.providerMessageId ?? null,
        templateName: input.templateName ?? null,
        createdByUserId: input.createdByUserId ?? null
      }
    });
    return toDomain(row);
  }

  async listByConversation(
    organizationId: string,
    conversationId: string
  ): Promise<Message[]> {
    const rows = await getDb().message.findMany({
      where: { organizationId, conversationId },
      orderBy: { createdAt: "asc" }
    });
    return rows.map(toDomain);
  }

  async findByProviderMessageId(
    organizationId: string,
    providerMessageId: string
  ): Promise<Message | null> {
    const row = await getDb().message.findFirst({
      where: { organizationId, providerMessageId }
    });
    return row ? toDomain(row) : null;
  }
}
