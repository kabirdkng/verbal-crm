import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { AiProvider } from "@/modules/ai/adapters/provider";
import {
  AiAssistRequestSchema,
  SuggestReplyRequestSchema,
  type AiAction
} from "@/modules/ai/contracts";
import type { AiUsageRepository } from "@/modules/ai/repository";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { ConversationsRepository } from "@/modules/conversations/repository";
import type { MessagesRepository } from "@/modules/messages/repository";
import type { IdentityRepository } from "@/modules/identity/repository";
import type { VoiceAgentConfigRepository } from "@/modules/voice-agent/repository";

const DEFAULT_BUDGET_USD = Number(process.env.AI_ORG_BUDGET_USD ?? "10");

export type AiBudgetSnapshot = {
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  percentUsed: number;
};

export type AiAssistResult = {
  suggestion: string;
  model: string;
  action: AiAction;
  usage: { tokensIn: number; tokensOut: number; estimatedCostUsd: number };
  budget: AiBudgetSnapshot;
};

export class AiService {
  constructor(
    private readonly provider: AiProvider,
    private readonly usageRepository: AiUsageRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly auditLogger: AuditLogger,
    private readonly budgetUsd: number = DEFAULT_BUDGET_USD,
    private readonly identityRepository?: IdentityRepository,
    private readonly voiceAgentConfigRepository?: VoiceAgentConfigRepository
  ) {}

  /** All tenant roles (admin / manager / agent) and platform-in-tenant can use AI. */
  private requireAiUser(context: AuthContext): void {
    requireAnyRole(context, ["admin", "manager", "agent"]);
  }

  async getBudget(context: AuthContext): Promise<AiBudgetSnapshot> {
    this.requireAiUser(context);
    return this.budgetSnapshot(context.organizationId);
  }

  private async budgetSnapshot(organizationId: string): Promise<AiBudgetSnapshot> {
    const spentUsd = await this.usageRepository.totalCostByOrganization(organizationId);
    const org = this.identityRepository
      ? await this.identityRepository.findOrganization(organizationId)
      : null;
    const budgetUsd = org?.aiBudgetUsd ?? this.budgetUsd;
    const remainingUsd = Math.max(0, budgetUsd - spentUsd);
    const percentUsed =
      budgetUsd <= 0 ? 100 : Math.min(100, Number(((spentUsd / budgetUsd) * 100).toFixed(1)));
    return { budgetUsd, spentUsd, remainingUsd, percentUsed };
  }

  async assist(context: AuthContext, payload: unknown): Promise<AiAssistResult> {
    this.requireAiUser(context);

    const parsed = AiAssistRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid AI assist payload",
        parsed.error.flatten()
      );
    }

    if (parsed.data.action === "improve_draft" && !parsed.data.draft?.trim()) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Draft text is required for improve_draft"
      );
    }

    const budget = await this.budgetSnapshot(context.organizationId);
    if (budget.remainingUsd <= 0) {
      throw new AppError(
        "FORBIDDEN",
        403,
        `Organization AI budget exceeded ($${budget.budgetUsd.toFixed(2)}). Ask an admin to raise the budget.`
      );
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

    // Inject tenant voice-agent context so chat replies match call persona/knowledge.
    let tenantInstruction = parsed.data.instruction;
    if (this.voiceAgentConfigRepository) {
      const voice = await this.voiceAgentConfigRepository.findByOrganization(
        context.organizationId
      );
      if (voice?.enabled) {
        const ctx = [
          `Tenant AI agent persona (${voice.agentName} @ ${voice.companyName}):`,
          voice.systemPrompt,
          voice.knowledgeBase ? `Knowledge:\n${voice.knowledgeBase}` : null
        ]
          .filter(Boolean)
          .join("\n");
        tenantInstruction = [ctx, tenantInstruction].filter(Boolean).join("\n\n");
      }
    }

    let result;
    try {
      result = await this.provider.assist({
        organizationId: context.organizationId,
        conversationId: conversation.id,
        action: parsed.data.action,
        tone: parsed.data.tone ?? "professional",
        contactName: contact?.fullName,
        draft: parsed.data.draft,
        instruction: tenantInstruction,
        language: parsed.data.language,
        recentMessages: messages.slice(-12).map((message) => ({
          direction: message.direction,
          body: message.body
        }))
      });
    } catch (error) {
      await this.auditLogger.log({
        action: "ai.assist_failed",
        organizationId: context.organizationId,
        actorUserId: context.userId,
        entityType: "conversation",
        entityId: conversation.id,
        metadata: {
          action: parsed.data.action,
          error: error instanceof Error ? error.message : "unknown"
        }
      });
      throw error;
    }

    await this.usageRepository.record({
      organizationId: context.organizationId,
      feature: parsed.data.action,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCostUsd: result.estimatedCostUsd,
      actorUserId: context.userId
    });

    await this.auditLogger.log({
      action: "ai.assist",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "conversation",
      entityId: conversation.id,
      metadata: {
        action: parsed.data.action,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedCostUsd: result.estimatedCostUsd
      }
    });

    const budgetAfter = await this.budgetSnapshot(context.organizationId);

    return {
      suggestion: result.text,
      model: result.model,
      action: parsed.data.action,
      usage: {
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedCostUsd: result.estimatedCostUsd
      },
      budget: budgetAfter
    };
  }

  /** Legacy suggest-reply entrypoint (all roles). */
  async suggestReply(
    context: AuthContext,
    payload: unknown
  ): Promise<AiAssistResult> {
    const parsed = SuggestReplyRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid suggest-reply payload",
        parsed.error.flatten()
      );
    }
    return this.assist(context, {
      conversationId: parsed.data.conversationId,
      action: "suggest_reply",
      tone: "professional"
    });
  }

  async listUsage(context: AuthContext): Promise<{
    totalEstimatedCostUsd: number;
    budget: AiBudgetSnapshot;
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
    // Everyone on the team can see org AI usage so they use budget effectively.
    this.requireAiUser(context);
    const records = await this.usageRepository.listByOrganization(context.organizationId);
    const budget = await this.budgetSnapshot(context.organizationId);
    return {
      totalEstimatedCostUsd: budget.spentUsd,
      budget,
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
