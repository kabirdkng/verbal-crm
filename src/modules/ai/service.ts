import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { AiProvider } from "@/modules/ai/adapters/provider";
import {
  SuggestReplyRequestSchema,
  type SuggestReplyRequest
} from "@/modules/ai/contracts";
import type { AiUsageRepository } from "@/modules/ai/repository";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { ConversationsRepository } from "@/modules/conversations/repository";
import type { MessagesRepository } from "@/modules/messages/repository";

const DEFAULT_BUDGET_USD = Number(process.env.AI_ORG_BUDGET_USD ?? "10");

export class AiService {
  constructor(
    private readonly provider: AiProvider,
    private readonly usageRepository: AiUsageRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly auditLogger: AuditLogger,
    private readonly budgetUsd: number = DEFAULT_BUDGET_USD
  ) {}

  async suggestReply(
    context: AuthContext,
    payload: unknown
  ): Promise<{
    suggestion: string;
    model: string;
    usage: { tokensIn: number; tokensOut: number; estimatedCostUsd: number };
  }> {
    requireAnyRole(context, ["admin", "manager", "agent"]);

    const parsed = SuggestReplyRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid suggest-reply payload",
        parsed.error.flatten()
      );
    }

    const totalCost = await this.usageRepository.totalCostByOrganization(
      context.organizationId
    );
    if (totalCost >= this.budgetUsd) {
      throw new AppError("FORBIDDEN", 403, "Organization AI budget exceeded");
    }

    const conversation = await this.conversationsRepository.findById(
      context.organizationId,
      parsed.data.conversationId
    );
    if (!conversation) {
      throw new AppError("NOT_FOUND", 404, "Conversation not found");
    }

    const messages = await this.messagesRepository.listByConversation(
      context.organizationId,
      conversation.id
    );
    const contact = await this.contactsRepository.findById(
      context.organizationId,
      conversation.contactId
    );

    const result = await this.provider.suggestReply({
      organizationId: context.organizationId,
      conversationId: conversation.id,
      contactName: contact?.fullName,
      recentMessages: messages.slice(-10).map((message) => ({
        direction: message.direction,
        body: message.body
      }))
    });

    await this.usageRepository.record({
      organizationId: context.organizationId,
      feature: "suggest_reply",
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCostUsd: result.estimatedCostUsd,
      actorUserId: context.userId
    });

    await this.auditLogger.log({
      action: "ai.suggest_reply",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "conversation",
      entityId: conversation.id,
      metadata: {
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedCostUsd: result.estimatedCostUsd
      }
    });

    return {
      suggestion: result.suggestion,
      model: result.model,
      usage: {
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedCostUsd: result.estimatedCostUsd
      }
    };
  }

  async listUsage(context: AuthContext): Promise<{
    totalEstimatedCostUsd: number;
    records: Array<{
      id: string;
      feature: string;
      model: string;
      tokensIn: number;
      tokensOut: number;
      estimatedCostUsd: number;
      actorUserId: string;
      createdAt: string;
    }>;
  }> {
    requireAnyRole(context, ["admin", "manager"]);
    const records = await this.usageRepository.listByOrganization(context.organizationId);
    const totalEstimatedCostUsd = records.reduce(
      (sum, item) => sum + item.estimatedCostUsd,
      0
    );
    return {
      totalEstimatedCostUsd,
      records: records.map((record) => ({
        id: record.id,
        feature: record.feature,
        model: record.model,
        tokensIn: record.tokensIn,
        tokensOut: record.tokensOut,
        estimatedCostUsd: record.estimatedCostUsd,
        actorUserId: record.actorUserId,
        createdAt: record.createdAt.toISOString()
      }))
    };
  }
}

export type { SuggestReplyRequest };
