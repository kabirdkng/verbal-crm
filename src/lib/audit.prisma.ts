import { getPrisma } from "@/lib/prisma";
import type { AuditEvent, AuditLogger } from "@/lib/audit";

export class PrismaAuditLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await getPrisma().auditEvent.create({
      data: {
        action: event.action,
        organizationId: event.organizationId,
        actorUserId: event.actorUserId,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: (event.metadata ?? undefined) as object | undefined
      }
    });
  }

  async listByOrganization(organizationId: string): Promise<AuditEvent[]> {
    const rows = await getPrisma().auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return rows.map((row) => ({
      action: row.action,
      organizationId: row.organizationId,
      actorUserId: row.actorUserId,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
      createdAt: row.createdAt
    }));
  }

  get events(): AuditEvent[] {
    return [];
  }
}
