import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { resetStore, seedDemoData } from "@/lib/store";
import { MockVapiClient } from "@/modules/voice-agent/adapters/vapi";
import { InMemoryVoiceAgentConfigRepository } from "@/modules/voice-agent/repository";
import { VoiceAgentService } from "@/modules/voice-agent/service";
import { CallingService } from "@/modules/calling/service";
import { InMemoryCallsRepository } from "@/modules/calling/repository";
import { MockWhatsAppCallingClient } from "@/modules/calling/adapters/client";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { InMemoryConversationsRepository } from "@/modules/conversations/repository";
import { InMemoryMessagesRepository } from "@/modules/messages/repository";
import { ensureDemoSeed } from "@/modules/identity/seed";

const admin: AuthContext = {
  userId: "u_demo_admin",
  organizationId: "org_demo",
  role: "admin"
};

const agent: AuthContext = {
  userId: "u_agent",
  organizationId: "org_demo",
  role: "agent"
};

describe("Voice agent + Vapi calling", () => {
  beforeEach(() => {
    resetStore();
    seedDemoData();
    ensureDemoSeed();
  });

  it("lets admins update tenant voice context and agents can read it", async () => {
    const repo = new InMemoryVoiceAgentConfigRepository();
    const service = new VoiceAgentService(repo, new InMemoryAuditLogger());

    const updated = await service.update(admin, {
      agentName: "Sales Bot",
      knowledgeBase: "We sell widgets. Free shipping over $50.",
      systemPrompt: "You are a sales agent for widgets."
    });
    expect(updated.agentName).toBe("Sales Bot");
    expect(updated.knowledgeBase).toContain("widgets");

    const read = await service.get(agent);
    expect(read.agentName).toBe("Sales Bot");
    expect(read.hasVapiApiKey).toBeTypeOf("boolean");
  });

  it("places a Vapi outbound call using tenant context", async () => {
    const contacts = new InMemoryContactsRepository();
    const conversations = new InMemoryConversationsRepository();
    const messages = new InMemoryMessagesRepository();
    const vapi = new MockVapiClient();
    const voiceRepo = new InMemoryVoiceAgentConfigRepository();
    const voiceService = new VoiceAgentService(voiceRepo, new InMemoryAuditLogger());
    await voiceService.update(admin, {
      knowledgeBase: "Refunds within 30 days.",
      firstMessage: "Hi from Demo!"
    });

    const contact = await contacts.create({
      organizationId: "org_demo",
      fullName: "Casey",
      phone: "+15559876543"
    });

    const calling = new CallingService(
      new InMemoryCallsRepository(),
      new MockWhatsAppCallingClient(),
      conversations,
      contacts,
      messages,
      new InMemoryAuditLogger(),
      undefined,
      vapi,
      voiceService
    );

    const call = await calling.initiate(agent, {
      contactId: contact.id,
      channel: "vapi"
    });

    expect(call.channel).toBe("vapi");
    expect(call.provider).toBe("vapi");
    expect(call.status).toBe("active");
    expect(vapi.calls).toHaveLength(1);
    expect(vapi.calls[0]!.config.knowledgeBase).toContain("Refunds");
    expect(vapi.calls[0]!.contactName).toBe("Casey");
  });

  it("forbids agents from updating voice agent config", async () => {
    const service = new VoiceAgentService(
      new InMemoryVoiceAgentConfigRepository(),
      new InMemoryAuditLogger()
    );
    await expect(
      service.update(agent, { agentName: "Nope" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("handles inbound assistant-request with tenant context", async () => {
    const contacts = new InMemoryContactsRepository();
    const conversations = new InMemoryConversationsRepository();
    const messages = new InMemoryMessagesRepository();
    const voiceRepo = new InMemoryVoiceAgentConfigRepository();
    const voiceService = new VoiceAgentService(voiceRepo, new InMemoryAuditLogger());
    await voiceService.update(admin, {
      knowledgeBase: "We ship in 2 days.",
      firstMessage: "Thanks for calling Demo!",
      vapiPhoneNumberId: "pn_demo_inbound"
    });

    const calling = new CallingService(
      new InMemoryCallsRepository(),
      new MockWhatsAppCallingClient(),
      conversations,
      contacts,
      messages,
      new InMemoryAuditLogger(),
      undefined,
      new MockVapiClient(),
      voiceService,
      voiceRepo
    );

    const result = await calling.handleVapiWebhook({
      message: {
        type: "assistant-request",
        call: {
          id: "vapi_live_in_1",
          type: "inboundPhoneCall",
          phoneNumberId: "pn_demo_inbound",
          customer: { number: "+15551112222", name: "Jordan" }
        }
      }
    });

    expect(result.kind).toBe("assistant-request");
    if (result.kind === "assistant-request") {
      expect(result.vapiResponse.assistant || result.vapiResponse.assistantId).toBeTruthy();
      const assistant = result.vapiResponse.assistant as
        | { firstMessage?: string; model?: { messages?: Array<{ content: string }> } }
        | undefined;
      if (assistant) {
        expect(assistant.firstMessage).toContain("Thanks for calling");
        expect(assistant.model?.messages?.[0]?.content).toMatch(/INBOUND|inbound/i);
        expect(assistant.model?.messages?.[0]?.content).toContain("ship in 2 days");
      }
    }

    const listed = await calling.list(admin, {});
    expect(listed.some((c) => c.direction === "user_initiated" && c.channel === "vapi")).toBe(
      true
    );
  });

  it("simulates inbound Vapi call for local demos", async () => {
    const contacts = new InMemoryContactsRepository();
    const conversations = new InMemoryConversationsRepository();
    const messages = new InMemoryMessagesRepository();
    const voiceRepo = new InMemoryVoiceAgentConfigRepository();
    const voiceService = new VoiceAgentService(voiceRepo, new InMemoryAuditLogger());
    await voiceService.update(admin, { enabled: true });

    const calling = new CallingService(
      new InMemoryCallsRepository(),
      new MockWhatsAppCallingClient(),
      conversations,
      contacts,
      messages,
      new InMemoryAuditLogger(),
      undefined,
      new MockVapiClient(),
      voiceService,
      voiceRepo
    );

    const call = await calling.simulateInboundVapi(agent, { from: "+15554443333" });
    expect(call.channel).toBe("vapi");
    expect(call.direction).toBe("user_initiated");
    expect(call.status).toBe("active");
  });
});
