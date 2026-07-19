import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import { resetStore } from "@/lib/store";
import { AutomationsService } from "@/modules/automations/service";
import { InMemoryTemplatesRepository } from "@/modules/templates/repository";
import { MockWhatsAppSender } from "@/modules/whatsapp/adapters/sender";

describe("AutomationsService", () => {
  beforeEach(() => {
    resetStore();
  });

  it("fires template when inbound body matches keyword", async () => {
    const templates = new InMemoryTemplatesRepository();
    const sender = new MockWhatsAppSender();
    const service = new AutomationsService(templates, sender, new InMemoryAuditLogger());

    await templates.create({
      organizationId: "org_a",
      name: "auto_ack",
      language: "en",
      body: "We received your request",
      status: "approved"
    });

    await service.create(
      { userId: "u_1", organizationId: "org_a", role: "admin" },
      { name: "Help rule", matchKeyword: "help", templateName: "auto_ack" }
    );

    const fired = await service.runForInbound({
      organizationId: "org_a",
      phone: "+15550001111",
      body: "I need HELP with billing"
    });

    expect(fired).toBe(1);
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]?.templateName).toBe("auto_ack");
  });
});
