import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { resetStore } from "@/lib/store";
import { BroadcastsService } from "@/modules/broadcasts/service";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { InMemoryTemplatesRepository } from "@/modules/templates/repository";
import { MockWhatsAppSender } from "@/modules/whatsapp/adapters/sender";

const admin: AuthContext = {
  userId: "u_1",
  organizationId: "org_a",
  role: "admin"
};

describe("BroadcastsService", () => {
  beforeEach(() => {
    resetStore();
  });

  it("sends template to all contacts", async () => {
    const contacts = new InMemoryContactsRepository();
    const templates = new InMemoryTemplatesRepository();
    const sender = new MockWhatsAppSender();
    const service = new BroadcastsService(
      contacts,
      templates,
      sender,
      new InMemoryAuditLogger()
    );

    await contacts.create({
      organizationId: "org_a",
      fullName: "A",
      phone: "+11111111111",
      tags: ["vip"]
    });
    await contacts.create({
      organizationId: "org_a",
      fullName: "B",
      phone: "+12222222222",
      tags: []
    });
    await templates.create({
      organizationId: "org_a",
      name: "promo",
      language: "en",
      body: "Hello everyone",
      status: "approved"
    });

    const all = await service.createAndSend(admin, {
      name: "All contacts",
      templateName: "promo"
    });
    expect(all.sentCount).toBe(2);

    const vip = await service.createAndSend(admin, {
      name: "VIP only",
      templateName: "promo",
      tag: "vip"
    });
    expect(vip.sentCount).toBe(1);
    expect(sender.sent.length).toBe(3);
  });
});
