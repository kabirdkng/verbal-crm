import { getPrisma } from "@/lib/prisma";
import type { AiUsageRecord } from "@/lib/store";
import type { AiUsageRepository, RecordUsageInput } from "@/modules/ai/repository";

export class PrismaAiUsageRepository implements AiUsageRepository {
  async record(input: RecordUsageInput): Promise<AiUsageRecord> {
    return getPrisma().aiUsage.create({
      data: {
        organizationId: input.organizationId,
        feature: input.feature,
        model: input.model,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
        estimatedCostUsd: input.estimatedCostUsd,
        actorUserId: input.actorUserId
      }
    });
  }

  async listByOrganization(organizationId: string): Promise<AiUsageRecord[]> {
    return getPrisma().aiUsage.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });
  }

  async totalCostByOrganization(organizationId: string): Promise<number> {
    const agg = await getPrisma().aiUsage.aggregate({
      where: { organizationId },
      _sum: { estimatedCostUsd: true }
    });
    return agg._sum.estimatedCostUsd ?? 0;
  }
}
