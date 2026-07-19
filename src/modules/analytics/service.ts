import { requireAnyRole, type AuthContext } from "@/lib/auth";
import { getPersistenceMode } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getDb } from "@/lib/prisma";
import { getStore } from "@/lib/store";

export class AnalyticsService {
  async overview(context: AuthContext) {
    requireAnyRole(context, ["admin", "manager", "agent"]);
    if (!isFeatureEnabled("analytics", context.organizationId)) {
      throw new AppError("FORBIDDEN", 403, "Analytics feature disabled");
    }

    const orgId = context.organizationId;

    if (getPersistenceMode() === "postgres") {
      const prisma = getDb();
      const [contacts, conversations, openConversations, messages, inbound, outbound, ai, broadcasts] =
        await Promise.all([
          prisma.contact.count({ where: { organizationId: orgId } }),
          prisma.conversation.count({ where: { organizationId: orgId } }),
          prisma.conversation.count({ where: { organizationId: orgId, status: "open" } }),
          prisma.message.count({ where: { organizationId: orgId } }),
          prisma.message.count({ where: { organizationId: orgId, direction: "inbound" } }),
          prisma.message.count({ where: { organizationId: orgId, direction: "outbound" } }),
          prisma.aiUsage.aggregate({
            where: { organizationId: orgId },
            _count: true,
            _sum: { estimatedCostUsd: true }
          }),
          prisma.broadcast.aggregate({
            where: { organizationId: orgId },
            _count: true,
            _sum: { sentCount: true }
          })
        ]);

      return {
        contacts,
        conversations,
        openConversations,
        messages: { total: messages, inbound, outbound },
        ai: {
          calls: ai._count,
          estimatedCostUsd: Number((ai._sum.estimatedCostUsd ?? 0).toFixed(6))
        },
        broadcasts: {
          total: broadcasts._count,
          sent: broadcasts._sum.sentCount ?? 0
        }
      };
    }

    const store = getStore();
    const contacts = store.contacts.filter((item) => item.organizationId === orgId);
    const conversations = store.conversations.filter((item) => item.organizationId === orgId);
    const messages = store.messages.filter((item) => item.organizationId === orgId);
    const aiUsage = store.aiUsage.filter((item) => item.organizationId === orgId);
    const broadcasts = store.broadcasts.filter((item) => item.organizationId === orgId);

    const inbound = messages.filter((item) => item.direction === "inbound").length;
    const outbound = messages.filter((item) => item.direction === "outbound").length;
    const openConversations = conversations.filter((item) => item.status === "open").length;
    const aiCost = aiUsage.reduce((sum, item) => sum + item.estimatedCostUsd, 0);

    return {
      contacts: contacts.length,
      conversations: conversations.length,
      openConversations,
      messages: {
        total: messages.length,
        inbound,
        outbound
      },
      ai: {
        calls: aiUsage.length,
        estimatedCostUsd: Number(aiCost.toFixed(6))
      },
      broadcasts: {
        total: broadcasts.length,
        sent: broadcasts.reduce((sum, item) => sum + item.sentCount, 0)
      }
    };
  }
}
