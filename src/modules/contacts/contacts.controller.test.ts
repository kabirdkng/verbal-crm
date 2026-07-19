import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuditLogger } from "@/lib/audit";
import { resetStore } from "@/lib/store";
import { ContactsController } from "@/modules/contacts/http/controller";
import { InMemoryContactsRepository } from "@/modules/contacts/repository";
import { ContactsService } from "@/modules/contacts/service";

function buildController() {
  const repository = new InMemoryContactsRepository();
  const auditLogger = new InMemoryAuditLogger();
  const service = new ContactsService(repository, auditLogger);
  const controller = new ContactsController(service);

  return { controller, repository, auditLogger };
}

function headerReader(entries: Record<string, string>) {
  return {
    get(name: string) {
      return entries[name.toLowerCase()] ?? null;
    }
  };
}

describe("ContactsController", () => {
  beforeEach(() => {
    resetStore();
  });

  it("creates a contact for the authenticated tenant", async () => {
    const { controller, auditLogger } = buildController();

    const result = await controller.post({
      headers: headerReader({
        "x-user-id": "u_1",
        "x-organization-id": "org_a",
        "x-role": "admin"
      }),
      async json() {
        return { fullName: "Alice", phone: "+15551234567", email: "alice@org.com" };
      }
    });

    expect(result.status).toBe(201);
    expect((result.body as { data: { organizationId: string } }).data.organizationId).toBe(
      "org_a"
    );
    expect(auditLogger.events).toHaveLength(1);
    expect(auditLogger.events[0]?.action).toBe("contact.created");
  });

  it("blocks create for agent role", async () => {
    const { controller } = buildController();

    const result = await controller.post({
      headers: headerReader({
        "x-user-id": "u_2",
        "x-organization-id": "org_a",
        "x-role": "agent"
      }),
      async json() {
        return { fullName: "Bob", phone: "+15557654321" };
      }
    });

    expect(result.status).toBe(403);
    expect((result.body as { error: { code: string } }).error.code).toBe("FORBIDDEN");
  });

  it("lists only contacts from the authenticated tenant", async () => {
    const { controller } = buildController();

    await controller.post({
      headers: headerReader({
        "x-user-id": "u_1",
        "x-organization-id": "org_a",
        "x-role": "manager"
      }),
      async json() {
        return { fullName: "Alice", phone: "+111111111" };
      }
    });

    await controller.post({
      headers: headerReader({
        "x-user-id": "u_3",
        "x-organization-id": "org_b",
        "x-role": "admin"
      }),
      async json() {
        return { fullName: "Charlie", phone: "+222222222" };
      }
    });

    const listA = await controller.get(
      headerReader({
        "x-user-id": "u_9",
        "x-organization-id": "org_a",
        "x-role": "agent"
      })
    );

    expect(listA.status).toBe(200);
    const records = (listA.body as { data: Array<{ organizationId: string; fullName: string }> })
      .data;
    expect(records).toHaveLength(1);
    expect(records[0]?.organizationId).toBe("org_a");
    expect(records[0]?.fullName).toBe("Alice");
  });

  it("returns validation error envelope for invalid payloads", async () => {
    const { controller } = buildController();

    const result = await controller.post({
      headers: headerReader({
        "x-user-id": "u_1",
        "x-organization-id": "org_a",
        "x-role": "admin"
      }),
      async json() {
        return { fullName: "", phone: "123" };
      }
    });

    expect(result.status).toBe(400);
    expect((result.body as { error: { code: string } }).error.code).toBe("VALIDATION_ERROR");
  });

  it("blocks cross-tenant contact get-by-id", async () => {
    const { controller } = buildController();

    const created = await controller.post({
      headers: headerReader({
        "x-user-id": "u_1",
        "x-organization-id": "org_a",
        "x-role": "admin"
      }),
      async json() {
        return { fullName: "Alice", phone: "+15550001111" };
      }
    });

    const contactId = (created.body as { data: { id: string } }).data.id;

    const foreign = await controller.getById(
      headerReader({
        "x-user-id": "u_2",
        "x-organization-id": "org_b",
        "x-role": "admin"
      }),
      contactId
    );

    expect(foreign.status).toBe(404);
  });
});
