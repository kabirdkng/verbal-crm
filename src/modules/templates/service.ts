import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import {
  CreateTemplateRequestSchema,
  type TemplateResponse
} from "@/modules/templates/contracts";
import type { MessageTemplate } from "@/modules/templates/domain";
import type { TemplatesRepository } from "@/modules/templates/repository";

export class TemplatesService {
  constructor(
    private readonly repository: TemplatesRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async create(context: AuthContext, payload: unknown): Promise<TemplateResponse> {
    requireAnyRole(context, ["admin", "manager"]);

    const parsed = CreateTemplateRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid template payload",
        parsed.error.flatten()
      );
    }

    const created = await this.repository.create({
      organizationId: context.organizationId,
      name: parsed.data.name,
      language: parsed.data.language,
      body: parsed.data.body,
      status: parsed.data.status
    });

    await this.auditLogger.log({
      action: "template.created",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "template",
      entityId: created.id,
      metadata: { name: created.name, status: created.status }
    });

    return this.toResponse(created);
  }

  async listForOrganization(context: AuthContext): Promise<TemplateResponse[]> {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    const records = await this.repository.listByOrganization(context.organizationId);
    return records.map((record) => this.toResponse(record));
  }

  private toResponse(template: MessageTemplate): TemplateResponse {
    return {
      id: template.id,
      organizationId: template.organizationId,
      name: template.name,
      language: template.language,
      body: template.body,
      status: template.status,
      createdAt: template.createdAt.toISOString()
    };
  }
}
