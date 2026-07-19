import { createId } from "@/lib/ids";
import { getStore, type TemplateRecord } from "@/lib/store";
import type { MessageTemplate, TemplateStatus } from "@/modules/templates/domain";

export type CreateTemplateInput = {
  organizationId: string;
  name: string;
  language: string;
  body: string;
  status: TemplateStatus;
};

export interface TemplatesRepository {
  create(input: CreateTemplateInput): Promise<MessageTemplate>;
  listByOrganization(organizationId: string): Promise<MessageTemplate[]>;
  findApprovedByName(organizationId: string, name: string): Promise<MessageTemplate | null>;
}

function toDomain(record: TemplateRecord): MessageTemplate {
  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    language: record.language,
    body: record.body,
    status: record.status,
    createdAt: record.createdAt
  };
}

export class InMemoryTemplatesRepository implements TemplatesRepository {
  async create(input: CreateTemplateInput): Promise<MessageTemplate> {
    const record: TemplateRecord = {
      id: createId("tpl"),
      organizationId: input.organizationId,
      name: input.name,
      language: input.language,
      body: input.body,
      status: input.status,
      createdAt: new Date()
    };
    getStore().templates.push(record);
    return toDomain(record);
  }

  async listByOrganization(organizationId: string): Promise<MessageTemplate[]> {
    return getStore()
      .templates.filter((item) => item.organizationId === organizationId)
      .map(toDomain);
  }

  async findApprovedByName(
    organizationId: string,
    name: string
  ): Promise<MessageTemplate | null> {
    const record = getStore().templates.find(
      (item) =>
        item.organizationId === organizationId &&
        item.name === name &&
        item.status === "approved"
    );
    return record ? toDomain(record) : null;
  }
}
