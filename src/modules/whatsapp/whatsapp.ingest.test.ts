import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEventBus } from "@/lib/events";
import { InMemoryJobQueue } from "@/lib/queue";
import { resetStore } from "@/lib/store";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";
import { MetaSignatureValidator } from "@/modules/whatsapp/adapters/signature";
import { WhatsAppIngestService } from "@/modules/whatsapp/ingest.service";
import { InMemoryWebhookEventsRepository } from "@/modules/whatsapp/repository";
import { WhatsAppInboundWorker } from "@/modules/whatsapp/worker";

function buildStack() {
  const queue = new InMemoryJobQueue();
  const webhookEvents = new InMemoryWebhookEventsRepository();
  const contacts = new InMemoryContactsRepository();
  const conversations = new InMemoryConversationsRepository();
  const messages = new InMemoryMessagesRepository();
  const eventBus = new InMemoryEventBus();
  const ingest = new WhatsAppIngestService(
    webhookEvents,
    queue,
    new MetaSignatureValidator(undefined, false)
  );
  const worker = new WhatsAppInboundWorker(
    contacts,
    conversations,
    messages,
    webhookEvents,
    eventBus
  );

  return { queue, webhookEvents, contacts, conversations, messages, eventBus, ingest, worker };
}

describe("WhatsApp webhook idempotency", () => {
  beforeEach(() => {
    resetStore();
  });

  it("acks quickly and processes inbound message via queue", async () => {
    const stack = buildStack();
    const payload = {
      organizationId: "org_a",
      message: {
        id: "wamid_1",
        from: "+15551230000",
        text: { body: "Hello team" },
        profileName: "Sam"
      }
    };

    const result = await stack.ingest.ingest(JSON.stringify(payload), payload, null, "org_a");
    expect(result.accepted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.jobId).toBeTruthy();

    const processed = await stack.queue.processAll((job) => stack.worker.handle(job));
    expect(processed).toBe(1);

    const contacts = await stack.contacts.listByOrganization("org_a");
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.fullName).toBe("Sam");

    const conversations = await stack.conversations.listByOrganization("org_a");
    expect(conversations).toHaveLength(1);

    const messages = await stack.messages.listByConversation(
      "org_a",
      conversations[0]!.id
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("Hello team");
    expect(messages[0]?.providerMessageId).toBe("wamid_1");
  });

  it("deduplicates duplicate provider message IDs", async () => {
    const stack = buildStack();
    const payload = {
      organizationId: "org_a",
      message: {
        id: "wamid_dup",
        from: "+15551230001",
        text: { body: "Ping" }
      }
    };

    const first = await stack.ingest.ingest(JSON.stringify(payload), payload, null, "org_a");
    expect(first.duplicate).toBe(false);

    await stack.queue.processAll((job) => stack.worker.handle(job));

    const second = await stack.ingest.ingest(JSON.stringify(payload), payload, null, "org_a");
    expect(second.accepted).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.jobId).toBeNull();

    const pending = await stack.queue.listPending();
    expect(pending).toHaveLength(0);

    const contacts = await stack.contacts.listByOrganization("org_a");
    expect(contacts).toHaveLength(1);

    const conversations = await stack.conversations.listByOrganization("org_a");
    const messages = await stack.messages.listByConversation(
      "org_a",
      conversations[0]!.id
    );
    expect(messages).toHaveLength(1);
  });

  it("resolves organization from Meta phone_number_id map", async () => {
    const queue = new InMemoryJobQueue();
    const webhookEvents = new InMemoryWebhookEventsRepository();
    const config = {
      mode: "mock" as const,
      accessToken: undefined,
      apiVersion: "v21.0",
      defaultPhoneNumberId: undefined,
      phoneNumberToOrg: new Map([["10999888777", "org_from_phone"]]),
      orgToPhoneNumber: new Map([["org_from_phone", "10999888777"]]),
      appSecret: undefined,
      requireSignature: false,
      verifyToken: "x",
      defaultOrganizationId: "org_fallback",
      inlineDrain: true
    };
    const ingest = new WhatsAppIngestService(
      webhookEvents,
      queue,
      new MetaSignatureValidator(undefined, false),
      config
    );

    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "10999888777" },
                contacts: [{ profile: { name: "Pat" }, wa_id: "15550001111" }],
                messages: [
                  {
                    from: "15550001111",
                    id: "wamid_meta_map",
                    text: { body: "Mapped org" }
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const result = await ingest.ingest(JSON.stringify(payload), payload, null, null);
    expect(result.organizationId).toBe("org_from_phone");
    expect(result.duplicate).toBe(false);
  });

  it("rejects invalid signatures when secret is configured", async () => {
    const queue = new InMemoryJobQueue();
    const webhookEvents = new InMemoryWebhookEventsRepository();
    const ingest = new WhatsAppIngestService(
      webhookEvents,
      queue,
      new MetaSignatureValidator("test-secret", true)
    );

    const payload = {
      message: { id: "wamid_x", from: "+1", text: { body: "x" } }
    };

    await expect(
      ingest.ingest(JSON.stringify(payload), payload, "sha256=deadbeef", null)
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
