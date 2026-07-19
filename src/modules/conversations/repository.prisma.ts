import { normalizePhone } from "@/lib/phone";
import { getDb } from "@/lib/prisma";
import type { Conversation, ConversationStatus } from "@/modules/conversations/domain";
import type {
  ConversationsRepository,
  CreateConversationInput
} from "@/modules/conversations/repository";

function toDomain(row: {
  id: string;
  organizationId: string;
  contactId: string;
  phone: string;
  status: string;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Conversation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    contactId: row.contactId,
    phone: row.phone,
    status: row.status as ConversationStatus,
    lastMessageAt: row.lastMessageAt,
    lastInboundAt: row.lastInboundAt,
    assignedUserId: row.assignedUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class PrismaConversationsRepository implements ConversationsRepository {
  async create(input: CreateConversationInput): Promise<Conversation> {
    const row = await getDb().conversation.create({
      data: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        phone: normalizePhone(input.phone),
        status: input.status ?? "open"
      }
    });
    return toDomain(row);
  }

  async listByOrganization(organizationId: string): Promise<Conversation[]> {
    const rows = await getDb().conversation.findMany({
      where: { organizationId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
    });
    return rows.map(toDomain);
  }

  async findById(
    organizationId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const row = await getDb().conversation.findFirst({
      where: { id: conversationId, organizationId }
    });
    return row ? toDomain(row) : null;
  }

  async findOpenByContact(
    organizationId: string,
    contactId: string
  ): Promise<Conversation | null> {
    const row = await getDb().conversation.findFirst({
      where: {
        organizationId,
        contactId,
        status: { not: "closed" }
      },
      orderBy: { createdAt: "desc" }
    });
    return row ? toDomain(row) : null;
  }

  async touchInbound(
    organizationId: string,
    conversationId: string,
    at: Date
  ): Promise<void> {
    await getDb().conversation.updateMany({
      where: { id: conversationId, organizationId },
      data: {
        lastInboundAt: at,
        lastMessageAt: at,
        status: "open",
        updatedAt: at
      }
    });
  }

  async touchOutbound(
    organizationId: string,
    conversationId: string,
    at: Date
  ): Promise<void> {
    await getDb().conversation.updateMany({
      where: { id: conversationId, organizationId },
      data: {
        lastMessageAt: at,
        updatedAt: at
      }
    });
  }

  async assign(
    organizationId: string,
    conversationId: string,
    assignedUserId: string | null
  ): Promise<Conversation | null> {
    const result = await getDb().conversation.updateMany({
      where: { id: conversationId, organizationId },
      data: { assignedUserId }
    });
    if (result.count === 0) {
      return null;
    }
    return this.findById(organizationId, conversationId);
  }

  async updateStatus(
    organizationId: string,
    conversationId: string,
    status: ConversationStatus
  ): Promise<Conversation | null> {
    const result = await getDb().conversation.updateMany({
      where: { id: conversationId, organizationId },
      data: { status }
    });
    if (result.count === 0) {
      return null;
    }
    return this.findById(organizationId, conversationId);
  }
}
