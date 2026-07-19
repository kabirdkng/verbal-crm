import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { resetStore } from "@/lib/store";
import { MockWhatsAppCallingClient } from "@/modules/calling/adapters/client";
import { InMemoryCallsRepository } from "@/modules/calling/repository";
import { CallingService } from "@/modules/calling/service";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";

const agent: AuthContext = {
  userId: "u_agent",
  organizationId: "org_a",
  role: "agent"
};

describe("CallingService", () => {
  beforeEach(() => {
    resetStore();
  });

  it("lets any agent initiate and terminate a mock WhatsApp call", async () => {
    const contacts = new InMemoryContactsRepository();
    const conversations = new InMemoryConversationsRepository();
    const messages = new InMemoryMessagesRepository();
    const calls = new InMemoryCallsRepository();
    const client = new MockWhatsAppCallingClient();
    const audit = new InMemoryAuditLogger();

    const contact = await contacts.create({
      organizationId: "org_a",
      fullName: "Riley",
      phone: "+15551230001"
    });
    const conversation = await conversations.create({
      organizationId: "org_a",
      contactId: contact.id,
      phone: contact.phone
    });

    const service = new CallingService(
      calls,
      client,
      conversations,
      contacts,
      messages,
      audit
    );

    const started = await service.initiate(agent, {
      conversationId: conversation.id,
      channel: "whatsapp"
    });
    expect(started.status).toBe("active");
    expect(started.direction).toBe("business_initiated");
    expect(started.channel).toBe("whatsapp");
    expect(client.connects).toHaveLength(1);

    const ended = await service.terminate(agent, started.id);
    expect(ended.status).toBe("completed");
    expect(client.controls.some((c) => c.action === "terminate")).toBe(true);

    const thread = await messages.listByConversation("org_a", conversation.id);
    expect(thread.some((m) => m.body.includes("Voice call"))).toBe(true);
  });

  it("sends a call permission request", async () => {
    const contacts = new InMemoryContactsRepository();
    const conversations = new InMemoryConversationsRepository();
    const messages = new InMemoryMessagesRepository();
    const client = new MockWhatsAppCallingClient();
    const service = new CallingService(
      new InMemoryCallsRepository(),
      client,
      conversations,
      contacts,
      messages,
      new InMemoryAuditLogger()
    );

    const contact = await contacts.create({
      organizationId: "org_a",
      fullName: "Riley",
      phone: "+15551230002"
    });
    const conversation = await conversations.create({
      organizationId: "org_a",
      contactId: contact.id,
      phone: contact.phone
    });

    const result = await service.requestPermission(agent, {
      conversationId: conversation.id
    });
    expect(result.status).toBe("permission_pending");
    expect(client.permissions).toHaveLength(1);
  });
});
