import { createId } from "@/lib/ids";
import { getStore, type MessageRecord } from "@/lib/store";
import type {
  Message,
  MessageChannel,
  MessageDirection,
  MessageStatus
} from "@/modules/messages/domain";

export type CreateMessageInput = {
  organizationId: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  channel?: MessageChannel;
  body: string;
  status: MessageStatus;
  providerMessageId?: string | null;
  templateName?: string | null;
  createdByUserId?: string | null;
};

export interface MessagesRepository {
  create(input: CreateMessageInput): Promise<Message>;
  listByConversation(organizationId: string, conversationId: string): Promise<Message[]>;
  findByProviderMessageId(
    organizationId: string,
    providerMessageId: string
  ): Promise<Message | null>;
}

function toDomain(record: MessageRecord): Message {
  return {
    id: record.id,
    organizationId: record.organizationId,
    conversationId: record.conversationId,
    contactId: record.contactId,
    direction: record.direction,
    channel: record.channel,
    body: record.body,
    status: record.status,
    providerMessageId: record.providerMessageId,
    templateName: record.templateName,
    createdAt: record.createdAt,
    createdByUserId: record.createdByUserId
  };
}

export class InMemoryMessagesRepository implements MessagesRepository {
  async create(input: CreateMessageInput): Promise<Message> {
    const record: MessageRecord = {
      id: createId("msg"),
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      direction: input.direction,
      channel: input.channel ?? "whatsapp",
      body: input.body,
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      templateName: input.templateName ?? null,
      createdAt: new Date(),
      createdByUserId: input.createdByUserId ?? null
    };
    getStore().messages.push(record);
    return toDomain(record);
  }

  async listByConversation(
    organizationId: string,
    conversationId: string
  ): Promise<Message[]> {
    return getStore()
      .messages.filter(
        (item) =>
          item.organizationId === organizationId && item.conversationId === conversationId
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toDomain);
  }

  async findByProviderMessageId(
    organizationId: string,
    providerMessageId: string
  ): Promise<Message | null> {
    const record = getStore().messages.find(
      (item) =>
        item.organizationId === organizationId &&
        item.providerMessageId === providerMessageId
    );
    return record ? toDomain(record) : null;
  }
}
