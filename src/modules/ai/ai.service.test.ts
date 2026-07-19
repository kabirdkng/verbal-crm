import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { resetStore } from "@/lib/store";
import { MockAiProvider } from "@/modules/ai/adapters/provider";
import { InMemoryAiUsageRepository } from "@/modules/ai/repository";
import { AiService } from "@/modules/ai/service";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";

const agent: AuthContext = {
  userId: "u_agent",
  organizationId: "org_a",
  role: "agent"
};

async function seedThread() {
  const contacts = new InMemoryContactsRepository();
  const conversations = new InMemoryConversationsRepository();
  const messages = new InMemoryMessagesRepository();
  const usage = new InMemoryAiUsageRepository();
  const audit = new InMemoryAuditLogger();

  const contact = await contacts.create({
    organizationId: "org_a",
    fullName: "Riley",
    phone: "+15553334444"
  });
  const conversation = await conversations.create({
    organizationId: "org_a",
    contactId: contact.id,
    phone: contact.phone
  });
  await messages.create({
    organizationId: "org_a",
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "inbound",
    body: "I need help with billing",
    status: "received"
  });

  const service = new AiService(
    new MockAiProvider(),
    usage,
    conversations,
    messages,
    contacts,
    audit,
    10
  );

  return { service, conversation, usage, audit };
}

describe("AiService for all roles", () => {
  beforeEach(() => {
    resetStore();
  });

  it("records usage when suggesting a reply", async () => {
    const { service, conversation, usage, audit } = await seedThread();
    const result = await service.suggestReply(agent, { conversationId: conversation.id });
    expect(result.suggestion.toLowerCase()).toContain("riley");
    expect(result.budget.remainingUsd).toBeLessThan(10);

    const records = await usage.listByOrganization("org_a");
    expect(records).toHaveLength(1);
    expect(records[0]?.feature).toBe("suggest_reply");
    expect(audit.events[0]?.action).toBe("ai.assist");
  });

  it("supports improve, summarize, next_steps for agents", async () => {
    const { service, conversation } = await seedThread();

    const improved = await service.assist(agent, {
      conversationId: conversation.id,
      action: "improve_draft",
      draft: "hi we can help",
      tone: "friendly"
    });
    expect(improved.suggestion.length).toBeGreaterThan(5);
    expect(improved.action).toBe("improve_draft");

    const summary = await service.assist(agent, {
      conversationId: conversation.id,
      action: "summarize"
    });
    expect(summary.suggestion.toLowerCase()).toContain("riley");

    const steps = await service.assist(agent, {
      conversationId: conversation.id,
      action: "next_steps"
    });
    expect(steps.suggestion).toMatch(/1\./);
  });

  it("lets agents view org budget and usage", async () => {
    const { service, conversation } = await seedThread();
    await service.assist(agent, {
      conversationId: conversation.id,
      action: "suggest_reply"
    });
    const usage = await service.listUsage(agent);
    expect(usage.records.length).toBe(1);
    expect(usage.budget.spentUsd).toBeGreaterThan(0);

    const budget = await service.getBudget(agent);
    expect(budget.budgetUsd).toBe(10);
  });

  it("blocks AI when organization budget is exceeded", async () => {
    const contacts = new InMemoryContactsRepository();
    const conversations = new InMemoryConversationsRepository();
    const messages = new InMemoryMessagesRepository();
    const usage = new InMemoryAiUsageRepository();
    const audit = new InMemoryAuditLogger();

    await usage.record({
      organizationId: "org_a",
      feature: "suggest_reply",
      model: "mock",
      tokensIn: 100,
      tokensOut: 100,
      estimatedCostUsd: 5,
      actorUserId: "u_prev"
    });

    const contact = await contacts.create({
      organizationId: "org_a",
      fullName: "Riley",
      phone: "+15553334444"
    });
    const conversation = await conversations.create({
      organizationId: "org_a",
      contactId: contact.id,
      phone: contact.phone
    });

    const service = new AiService(
      new MockAiProvider(),
      usage,
      conversations,
      messages,
      contacts,
      audit,
      5
    );

    await expect(
      service.suggestReply(agent, { conversationId: conversation.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
