import { createId } from "@/lib/ids";
import { getStore, type AiUsageRecord } from "@/lib/store";

export type RecordUsageInput = {
  organizationId: string;
  feature: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
  actorUserId: string;
};

export interface AiUsageRepository {
  record(input: RecordUsageInput): Promise<AiUsageRecord>;
  listByOrganization(organizationId: string): Promise<AiUsageRecord[]>;
  totalCostByOrganization(organizationId: string): Promise<number>;
}

export class InMemoryAiUsageRepository implements AiUsageRepository {
  async record(input: RecordUsageInput): Promise<AiUsageRecord> {
    const record: AiUsageRecord = {
      id: createId("aiu"),
      organizationId: input.organizationId,
      feature: input.feature,
      model: input.model,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      estimatedCostUsd: input.estimatedCostUsd,
      actorUserId: input.actorUserId,
      createdAt: new Date()
    };
    getStore().aiUsage.push(record);
    return record;
  }

  async listByOrganization(organizationId: string): Promise<AiUsageRecord[]> {
    return getStore().aiUsage.filter((item) => item.organizationId === organizationId);
  }

  async totalCostByOrganization(organizationId: string): Promise<number> {
    const records = await this.listByOrganization(organizationId);
    return records.reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  }
}
