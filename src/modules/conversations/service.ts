import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { isWithinServiceWindow } from "@/lib/service-window";
import type { ContactsRepository } from "@/modules/contacts/repository";
import {
  CreateConversationRequestSchema,
  type ConversationResponse
} from "@/modules/conversations/contracts";
import type { Conversation } from "@/modules/conversations/domain";
import type { ConversationsRepository } from "@/modules/conversations/repository";

export class ConversationsService {
  constructor(
    private readonly repository: ConversationsRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async create(context: AuthContext, payload: unknown): Promise<ConversationResponse> {
    requireAnyRole(context, ["admin", "manager", "agent"]);

    const parsed = CreateConversationRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid conversation payload",
        parsed.error.flatten()
      );
    }

    const contact = await this.contactsRepository.findById(
      context.organizationId,
      parsed.data.contactId
    );
    if (!contact) {
      throw new AppError("NOT_FOUND", 404, "Contact not found");
    }

    const existing = await this.repository.findOpenByContact(
      context.organizationId,
      contact.id
    );
    if (existing) {
      return this.toResponse(existing);
    }

    const created = await this.repository.create({
      organizationId: context.organizationId,
      contactId: contact.id,
      phone: parsed.data.phone ?? contact.phone
    });

    await this.auditLogger.log({
      action: "conversation.created",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "conversation",
      entityId: created.id,
      metadata: { contactId: contact.id }
    });

    return this.toResponse(created);
  }

  async listForOrganization(context: AuthContext): Promise<ConversationResponse[]> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const records = await this.repository.listByOrganization(context.organizationId);
    return records.map((record) => this.toResponse(record));
  }

  async getById(context: AuthContext, conversationId: string): Promise<ConversationResponse> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const record = await this.repository.findById(context.organizationId, conversationId);
    if (!record) {
      throw new AppError("NOT_FOUND", 404, "Conversation not found");
    }
    return this.toResponse(record);
  }

  async assign(
    context: AuthContext,
    conversationId: string,
    assignedUserId: string | null
  ): Promise<ConversationResponse> {
    requireAnyRole(context, ["admin", "manager"]);
    const record = await this.repository.assign(
      context.organizationId,
      conversationId,
      assignedUserId
    );
    if (!record) {
      throw new AppError("NOT_FOUND", 404, "Conversation not found");
    }

    await this.auditLogger.log({
      action: "conversation.assigned",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "conversation",
      entityId: conversationId,
      metadata: { assignedUserId }
    });

    return this.toResponse(record);
  }

  async setStatus(
    context: AuthContext,
    conversationId: string,
    status: "open" | "pending" | "closed"
  ): Promise<ConversationResponse> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const record = await this.repository.updateStatus(
      context.organizationId,
      conversationId,
      status
    );
    if (!record) {
      throw new AppError("NOT_FOUND", 404, "Conversation not found");
    }
    return this.toResponse(record);
  }

  private toResponse(conversation: Conversation): ConversationResponse {
    return {
      id: conversation.id,
      organizationId: conversation.organizationId,
      contactId: conversation.contactId,
      phone: conversation.phone,
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      lastInboundAt: conversation.lastInboundAt?.toISOString() ?? null,
      serviceWindowOpen: isWithinServiceWindow(conversation.lastInboundAt),
      assignedUserId: conversation.assignedUserId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString()
    };
  }
}
