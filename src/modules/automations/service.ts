import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createId } from "@/lib/ids";
import { getStore, type AutomationRuleRecord } from "@/lib/store";
import { z } from "zod";
import type { TemplatesRepository } from "@/modules/templates/repository";
import type { WhatsAppSender } from "@/modules/whatsapp/adapters/sender";

const CreateRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  matchKeyword: z.string().trim().min(1).max(80),
  templateName: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional()
});

export class AutomationsService {
  constructor(
    private readonly templatesRepository: TemplatesRepository,
    private readonly whatsAppSender: WhatsAppSender,
    private readonly auditLogger: AuditLogger
  ) {}

  async list(context: AuthContext) {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    return getStore().automationRules.filter(
      (rule) => rule.organizationId === context.organizationId
    );
  }

  async create(context: AuthContext, payload: unknown) {
    requireAnyRole(context, ["admin", "manager"]);
    if (!isFeatureEnabled("automations", context.organizationId)) {
      throw new AppError("FORBIDDEN", 403, "Automations feature disabled");
    }

    const parsed = CreateRuleSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid automation payload",
        parsed.error.flatten()
      );
    }

    const template = await this.templatesRepository.findApprovedByName(
      context.organizationId,
      parsed.data.templateName
    );
    if (!template) {
      throw new AppError("NOT_FOUND", 404, "Approved template not found");
    }

    const rule: AutomationRuleRecord = {
      id: createId("auto"),
      organizationId: context.organizationId,
      name: parsed.data.name,
      enabled: parsed.data.enabled ?? true,
      matchKeyword: parsed.data.matchKeyword.toLowerCase(),
      templateName: parsed.data.templateName,
      createdAt: new Date()
    };
    getStore().automationRules.push(rule);

    await this.auditLogger.log({
      action: "automation.created",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "automation",
      entityId: rule.id,
      metadata: { matchKeyword: rule.matchKeyword, templateName: rule.templateName }
    });

    return rule;
  }

  /**
   * Fire matching keyword rules for an inbound message.
   * Called from worker — never from webhook request path.
   */
  async runForInbound(input: {
    organizationId: string;
    phone: string;
    body: string;
  }): Promise<number> {
    if (!isFeatureEnabled("automations", input.organizationId)) {
      return 0;
    }

    const body = input.body.toLowerCase();
    const rules = getStore().automationRules.filter(
      (rule) =>
        rule.organizationId === input.organizationId &&
        rule.enabled &&
        body.includes(rule.matchKeyword)
    );

    let fired = 0;
    for (const rule of rules) {
      const template = await this.templatesRepository.findApprovedByName(
        input.organizationId,
        rule.templateName
      );
      if (!template) {
        continue;
      }
      await this.whatsAppSender.sendText({
        organizationId: input.organizationId,
        to: input.phone,
        body: template.body,
        templateName: template.name
      });
      fired += 1;
    }
    return fired;
  }
}
