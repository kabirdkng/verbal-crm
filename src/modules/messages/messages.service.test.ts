import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import { InMemoryEventBus } from "@/lib/events";
import { resetStore } from "@/lib/store";
import type { AuthContext } from "@/lib/auth";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";
import { MessagesService } from "@/modules/messages/service";
import { InMemoryTemplatesRepository } from "@/modules/templates/repository";
import { MockWhatsAppSender } from "@/modules/whatsapp/adapters/sender";

const admin: AuthContext = {
  userId: "u_1",
  organizationId: "org_a",
  role: "admin"
};

async function buildService() {
  const contacts = new InMemoryContactsRepository();
  const conversations = new InMemoryConversationsRepository();
  const messages = new InMemoryMessagesRepository();
  const templates = new InMemoryTemplatesRepository();
  const sender = new MockWhatsAppSender();
  const audit = new InMemoryAuditLogger();
  const events = new InMemoryEventBus();
  const service = new MessagesService(
    messages,
    conversations,
    templates,
    sender,
    audit,
    events
  );

  const contact = await contacts.create({
    organizationId: "org_a",
    fullName: "Alice",
    phone: "+15551112222"
  });
  const conversation = await conversations.create({
    organizationId: "org_a",
    contactId: contact.id,
    phone: contact.phone
  });

  await templates.create({
    organizationId: "org_a",
    name: "welcome_followup",
    language: "en",
    body: "Thanks for messaging us.",
    status: "approved"
  });

  return { service, conversations, conversation, sender, audit };
}

describe("MessagesService service window", () => {
  beforeEach(() => {
    resetStore();
  });

  it("rejects free-form outbound outside the 24-hour window", async () => {
    const { service, conversation } = await buildService();

    await expect(
      service.sendOutbound(admin, conversation.id, { body: "Hello again" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403
    });
  });

  it("allows template outbound outside the window", async () => {
    const { service, conversation, sender, audit } = await buildService();

    const message = await service.sendOutbound(admin, conversation.id, {
      templateName: "welcome_followup"
    });

    expect(message.templateName).toBe("welcome_followup");
    expect(message.body).toBe("Thanks for messaging us.");
    expect(sender.sent).toHaveLength(1);
    expect(audit.events.some((event) => event.action === "message.outbound_sent")).toBe(true);
  });

  it("allows free-form outbound within the service window", async () => {
    const { service, conversations, conversation } = await buildService();
    await conversations.touchInbound("org_a", conversation.id, new Date());

    const message = await service.sendOutbound(admin, conversation.id, {
      body: "We can help right away"
    });

    expect(message.body).toBe("We can help right away");
    expect(message.status).toBe("sent");
  });

  it("blocks cross-tenant message list", async () => {
    const { service, conversation } = await buildService();
    const other: AuthContext = {
      userId: "u_2",
      organizationId: "org_b",
      role: "admin"
    };

    await expect(service.listForConversation(other, conversation.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404
    });
  });
});
