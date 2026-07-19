import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import type { EventBus } from "@/lib/events";
import { AppError } from "@/lib/errors";
import { isWithinServiceWindow } from "@/lib/service-window";
import type { ConversationsRepository } from "@/modules/conversations/repository";
import {
  SendMessageRequestSchema,
  type MessageResponse
} from "@/modules/messages/contracts";
import type { Message } from "@/modules/messages/domain";
import type { MessagesRepository } from "@/modules/messages/repository";
import type { TemplatesRepository } from "@/modules/templates/repository";
import type { WhatsAppSender } from "@/modules/whatsapp/adapters/sender";

export class MessagesService {
  constructor(
    private readonly repository: MessagesRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly templatesRepository: TemplatesRepository,
    private readonly whatsAppSender: WhatsAppSender,
    private readonly auditLogger: AuditLogger,
    private readonly eventBus: EventBus
  ) {}

  async listForConversation(
    context: AuthContext,
    conversationId: string
  ): Promise<MessageResponse[]> {
    requireAnyRole(context, ["admin", "manager", "agent"]);

    const conversation = await this.conversationsRepository.findById(
      context.organizationId,
      conversationId
    );
    if (!conversation) {
      throw new AppError("NOT_FOUND", 404, "Conversation not found");
    }

    const messages = await this.repository.listByConversation(
      context.organizationId,
      conversationId
    );
    return messages.map((message) => this.toResponse(message));
  }

  async sendOutbound(
    context: AuthContext,
    conversationId: string,
    payload: unknown
  ): Promise<MessageResponse> {
    requireAnyRole(context, ["admin", "manager", "agent"]);

    const parsed = SendMessageRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid message payload",
        parsed.error.flatten()
      );
    }

    const conversation = await this.conversationsRepository.findById(
      context.organizationId,
      conversationId
    );
    if (!conversation) {
      throw new AppError("NOT_FOUND", 404, "Conversation not found");
    }

    const windowOpen = isWithinServiceWindow(conversation.lastInboundAt);
    let body = parsed.data.body?.trim() ?? "";
    let templateName: string | null = parsed.data.templateName ?? null;

    if (!windowOpen) {
      if (!templateName) {
        throw new AppError(
          "FORBIDDEN",
          403,
          "Outside 24-hour service window: approved template required"
        );
      }
      const template = await this.templatesRepository.findApprovedByName(
        context.organizationId,
        templateName
      );
      if (!template) {
        throw new AppError("NOT_FOUND", 404, "Approved template not found");
      }
      body = template.body;
    } else if (templateName) {
      const template = await this.templatesRepository.findApprovedByName(
        context.organizationId,
        templateName
      );
      if (!template) {
        throw new AppError("NOT_FOUND", 404, "Approved template not found");
      }
      body = template.body;
    }

    if (!body) {
      throw new AppError("VALIDATION_ERROR", 400, "Message body is required");
    }

    const sendResult = await this.whatsAppSender.sendText({
      organizationId: context.organizationId,
      to: conversation.phone,
      body,
      templateName
    });

    const now = new Date();
    const message = await this.repository.create({
      organizationId: context.organizationId,
      conversationId: conversation.id,
      contactId: conversation.contactId,
      direction: "outbound",
      body,
      status: sendResult.status,
      providerMessageId: sendResult.providerMessageId,
      templateName,
      createdByUserId: context.userId
    });

    await this.conversationsRepository.touchOutbound(
      context.organizationId,
      conversation.id,
      now
    );

    await this.auditLogger.log({
      action: "message.outbound_sent",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "message",
      entityId: message.id,
      metadata: {
        conversationId: conversation.id,
        templateName,
        withinServiceWindow: windowOpen
      }
    });

    await this.eventBus.publish({
      organizationId: context.organizationId,
      type: "message.outbound",
      payload: {
        messageId: message.id,
        conversationId: conversation.id
      }
    });

    return this.toResponse(message);
  }

  private toResponse(message: Message): MessageResponse {
    return {
      id: message.id,
      organizationId: message.organizationId,
      conversationId: message.conversationId,
      contactId: message.contactId,
      direction: message.direction,
      channel: message.channel,
      body: message.body,
      status: message.status,
      providerMessageId: message.providerMessageId,
      templateName: message.templateName,
      createdAt: message.createdAt.toISOString(),
      createdByUserId: message.createdByUserId
    };
  }
}
