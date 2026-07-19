import { getAuthContext, requireAnyRole, type HeaderReader } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { toErrorEnvelope } from "@/lib/errors";
import { z } from "zod";

const AuditListResponseSchema = z.object({
  data: z.array(
    z.object({
      action: z.string(),
      organizationId: z.string(),
      actorUserId: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      metadata: z.record(z.unknown()).optional(),
      createdAt: z.string().optional()
    })
  )
});

export type JsonResponse = {
  status: number;
  body: unknown;
};

export class AuditController {
  constructor(private readonly auditLogger: AuditLogger) {}

  async list(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      requireAnyRole(context, ["admin", "manager"]);
      const events = await this.auditLogger.listByOrganization(context.organizationId);
      const body = AuditListResponseSchema.parse({
        data: events.map((event) => ({
          action: event.action,
          organizationId: event.organizationId,
          actorUserId: event.actorUserId,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: event.metadata,
          createdAt: event.createdAt?.toISOString()
        }))
      });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
