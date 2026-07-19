import { createId } from "@/lib/ids";
import { normalizePhone } from "@/lib/phone";
import { getStore, type ConversationRecord } from "@/lib/store";
import type { Conversation, ConversationStatus } from "@/modules/conversations/domain";

export type CreateConversationInput = {
  organizationId: string;
  contactId: string;
  phone: string;
  status?: ConversationStatus;
};

export interface ConversationsRepository {
  create(input: CreateConversationInput): Promise<Conversation>;
  listByOrganization(organizationId: string): Promise<Conversation[]>;
  findById(organizationId: string, conversationId: string): Promise<Conversation | null>;
  findOpenByContact(
    organizationId: string,
    contactId: string
  ): Promise<Conversation | null>;
  touchInbound(organizationId: string, conversationId: string, at: Date): Promise<void>;
  touchOutbound(organizationId: string, conversationId: string, at: Date): Promise<void>;
}

function toDomain(record: ConversationRecord): Conversation {
  return {
    id: record.id,
    organizationId: record.organizationId,
    contactId: record.contactId,
    phone: record.phone,
    status: record.status,
    lastMessageAt: record.lastMessageAt,
    lastInboundAt: record.lastInboundAt,
    assignedUserId: record.assignedUserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class InMemoryConversationsRepository implements ConversationsRepository {
  async create(input: CreateConversationInput): Promise<Conversation> {
    const now = new Date();
    const record: ConversationRecord = {
      id: createId("cv"),
      organizationId: input.organizationId,
      contactId: input.contactId,
      phone: normalizePhone(input.phone),
      status: input.status ?? "open",
      lastMessageAt: null,
      lastInboundAt: null,
      assignedUserId: null,
      createdAt: now,
      updatedAt: now
    };
    getStore().conversations.push(record);
    return toDomain(record);
  }

  async listByOrganization(organizationId: string): Promise<Conversation[]> {
    return getStore()
      .conversations.filter((item) => item.organizationId === organizationId)
      .sort((a, b) => {
        const aTime = a.lastMessageAt?.getTime() ?? a.createdAt.getTime();
        const bTime = b.lastMessageAt?.getTime() ?? b.createdAt.getTime();
        return bTime - aTime;
      })
      .map(toDomain);
  }

  async findById(organizationId: string, conversationId: string): Promise<Conversation | null> {
    const record = getStore().conversations.find(
      (item) => item.id === conversationId && item.organizationId === organizationId
    );
    return record ? toDomain(record) : null;
  }

  async findOpenByContact(
    organizationId: string,
    contactId: string
  ): Promise<Conversation | null> {
    const record = getStore().conversations.find(
      (item) =>
        item.organizationId === organizationId &&
        item.contactId === contactId &&
        item.status !== "closed"
    );
    return record ? toDomain(record) : null;
  }

  async touchInbound(
    organizationId: string,
    conversationId: string,
    at: Date
  ): Promise<void> {
    const record = getStore().conversations.find(
      (item) => item.id === conversationId && item.organizationId === organizationId
    );
    if (!record) {
      return;
    }
    record.lastInboundAt = at;
    record.lastMessageAt = at;
    record.status = "open";
    record.updatedAt = at;
  }

  async touchOutbound(
    organizationId: string,
    conversationId: string,
    at: Date
  ): Promise<void> {
    const record = getStore().conversations.find(
      (item) => item.id === conversationId && item.organizationId === organizationId
    );
    if (!record) {
      return;
    }
    record.lastMessageAt = at;
    record.updatedAt = at;
  }
}
