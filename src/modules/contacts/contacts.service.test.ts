import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { resetStore } from "@/lib/store";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { ContactsService } from "@/modules/contacts/service";

const admin: AuthContext = {
  userId: "u_1",
  organizationId: "org_a",
  role: "admin"
};

describe("ContactsService update/delete", () => {
  beforeEach(() => {
    resetStore();
  });

  it("updates and deletes contacts with audit", async () => {
    const repo = new InMemoryContactsRepository();
    const audit = new InMemoryAuditLogger();
    const service = new ContactsService(repo, audit);

    const created = await service.create(admin, {
      fullName: "Alice",
      phone: "+15550001111",
      tags: ["vip"]
    });

    const updated = await service.update(admin, created.id, {
      fullName: "Alice B",
      tags: ["vip", "billing"]
    });
    expect(updated.fullName).toBe("Alice B");
    expect(updated.tags).toContain("billing");

    await service.delete(admin, created.id);
    await expect(service.getById(admin, created.id)).rejects.toMatchObject({
      code: "NOT_FOUND"
    });

    expect(audit.events.map((e) => e.action)).toEqual([
      "contact.created",
      "contact.updated",
      "contact.deleted"
    ]);
  });
});
