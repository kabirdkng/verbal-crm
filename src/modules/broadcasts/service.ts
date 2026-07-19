import { requireAnyRole, type AuthContext } from "@/lib/auth";
import type { AuditLogger } from "@/lib/audit";
import { getPersistenceMode } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createId } from "@/lib/ids";
import { getPrisma } from "@/lib/prisma";
import { getStore, type BroadcastRecord, type BroadcastStatus } from "@/lib/store";
import { z } from "zod";
import type { ContactsRepository } from "@/modules/contacts/repository";
import type { TemplatesRepository } from "@/modules/templates/repository";
import type { WhatsAppSender } from "@/modules/whatsapp/adapters/sender";

const CreateBroadcastSchema = z.object({
  name: z.string().trim().min(1).max(120),
  templateName: z.string().trim().min(1).max(120),
  tag: z.string().trim().min(1).max(40).optional()
});

export class BroadcastsService {
  constructor(
    private readonly contactsRepository: ContactsRepository,
    private readonly templatesRepository: TemplatesRepository,
    private readonly whatsAppSender: WhatsAppSender,
    private readonly auditLogger: AuditLogger
  ) {}

  async createAndSend(context: AuthContext, payload: unknown) {
    requireAnyRole(context, ["admin", "manager"]);
    if (!isFeatureEnabled("broadcasts", context.organizationId)) {
      throw new AppError("FORBIDDEN", 403, "Broadcasts feature disabled");
    }

    const parsed = CreateBroadcastSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Invalid broadcast payload",
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

    let contacts = await this.contactsRepository.listByOrganization(context.organizationId);
    if (parsed.data.tag) {
      contacts = contacts.filter((contact) => contact.tags.includes(parsed.data.tag!));
    }

    let broadcast: BroadcastRecord;
    if (getPersistenceMode() === "postgres") {
      const row = await getPrisma().broadcast.create({
        data: {
          organizationId: context.organizationId,
          name: parsed.data.name,
          templateName: template.name,
          status: "sending",
          createdByUserId: context.userId,
          totalRecipients: contacts.length,
          sentCount: 0,
          failedCount: 0
        }
      });
      broadcast = { ...row, status: row.status as BroadcastStatus };
    } else {
      broadcast = {
        id: createId("bc"),
        organizationId: context.organizationId,
        name: parsed.data.name,
        templateName: template.name,
        status: "sending",
        createdByUserId: context.userId,
        totalRecipients: contacts.length,
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
        completedAt: null
      };
      getStore().broadcasts.push(broadcast);
    }

    for (const contact of contacts) {
      try {
        await this.whatsAppSender.sendText({
          organizationId: context.organizationId,
          to: contact.phone,
          body: template.body,
          templateName: template.name
        });
        broadcast.sentCount += 1;
      } catch {
        broadcast.failedCount += 1;
      }
    }

    broadcast.status =
      broadcast.failedCount > 0 && broadcast.sentCount === 0 ? "failed" : "completed";
    broadcast.completedAt = new Date();

    if (getPersistenceMode() === "postgres") {
      const row = await getPrisma().broadcast.update({
        where: { id: broadcast.id },
        data: {
          sentCount: broadcast.sentCount,
          failedCount: broadcast.failedCount,
          status: broadcast.status,
          completedAt: broadcast.completedAt
        }
      });
      broadcast = { ...row, status: row.status as BroadcastStatus };
    }

    await this.auditLogger.log({
      action: "broadcast.completed",
      organizationId: context.organizationId,
      actorUserId: context.userId,
      entityType: "broadcast",
      entityId: broadcast.id,
      metadata: {
        sentCount: broadcast.sentCount,
        failedCount: broadcast.failedCount,
        templateName: template.name
      }
    });

    return broadcast;
  }

  async list(context: AuthContext) {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    if (getPersistenceMode() === "postgres") {
      const rows = await getPrisma().broadcast.findMany({
        where: { organizationId: context.organizationId },
        orderBy: { createdAt: "desc" }
      });
      return rows.map((row) => ({ ...row, status: row.status as BroadcastStatus }));
    }
    return getStore()
      .broadcasts.filter((item) => item.organizationId === context.organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
