import { getPrisma } from "@/lib/prisma";
import type { MessageTemplate, TemplateStatus } from "@/modules/templates/domain";
import type { CreateTemplateInput, TemplatesRepository } from "@/modules/templates/repository";

function toDomain(row: {
  id: string;
  organizationId: string;
  name: string;
  language: string;
  body: string;
  status: string;
  createdAt: Date;
}): MessageTemplate {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    language: row.language,
    body: row.body,
    status: row.status as TemplateStatus,
    createdAt: row.createdAt
  };
}

export class PrismaTemplatesRepository implements TemplatesRepository {
  async create(input: CreateTemplateInput): Promise<MessageTemplate> {
    const row = await getPrisma().messageTemplate.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        language: input.language,
        body: input.body,
        status: input.status
      }
    });
    return toDomain(row);
  }

  async listByOrganization(organizationId: string): Promise<MessageTemplate[]> {
    const rows = await getPrisma().messageTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(toDomain);
  }

  async findApprovedByName(
    organizationId: string,
    name: string
  ): Promise<MessageTemplate | null> {
    const row = await getPrisma().messageTemplate.findFirst({
      where: { organizationId, name, status: "approved" }
    });
    return row ? toDomain(row) : null;
  }
}
