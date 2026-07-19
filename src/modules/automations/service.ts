import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { getPersistenceMode } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createId } from "@/lib/ids";
import { getDb } from "@/lib/prisma";
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
    if (getPersistenceMode() === "postgres") {
      return getDb().automationRule.findMany({
        where: { organizationId: context.organizationId },
        orderBy: { createdAt: "desc" }
      });
    }
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

    let rule: AutomationRuleRecord;
    if (getPersistenceMode() === "postgres") {
      rule = await getDb().automationRule.create({
        data: {
          organizationId: context.organizationId,
          name: parsed.data.name,
          enabled: parsed.data.enabled ?? true,
          matchKeyword: parsed.data.matchKeyword.toLowerCase(),
          templateName: parsed.data.templateName
        }
      });
    } else {
      rule = {
        id: createId("auto"),
        organizationId: context.organizationId,
        name: parsed.data.name,
        enabled: parsed.data.enabled ?? true,
        matchKeyword: parsed.data.matchKeyword.toLowerCase(),
        templateName: parsed.data.templateName,
        createdAt: new Date()
      };
      getStore().automationRules.push(rule);
    }

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

  async runForInbound(input: {
    organizationId: string;
    phone: string;
    body: string;
  }): Promise<number> {
    if (!isFeatureEnabled("automations", input.organizationId)) {
      return 0;
    }

    const body = input.body.toLowerCase();
    let rules: AutomationRuleRecord[];
    if (getPersistenceMode() === "postgres") {
      rules = await getDb().automationRule.findMany({
        where: { organizationId: input.organizationId, enabled: true }
      });
    } else {
      rules = getStore().automationRules.filter(
        (rule) => rule.organizationId === input.organizationId && rule.enabled
      );
    }

    rules = rules.filter((rule) => body.includes(rule.matchKeyword));

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
