import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaAuditLogger } from "@/lib/audit.prisma";
import { disconnectPrisma, getPrismaAdmin, runWithTenant } from "@/lib/prisma";
import { ContactsController } from "@/modules/contacts/http/controller";
import { PrismaContactsRepository } from "@/modules/contacts/repository.prisma";
import { ContactsService } from "@/modules/contacts/service";

const run = process.env.PERSISTENCE_MODE === "postgres" && Boolean(process.env.DATABASE_URL);

function headerReader(entries: Record<string, string>) {
  return {
    get(name: string) {
      return entries[name.toLowerCase()] ?? null;
    }
  };
}

describe.runIf(run)("Contacts Postgres integration", () => {
  const orgId = `org_it_${Date.now()}`;
  let controller: ContactsController;

  beforeAll(async () => {
    process.env.PERSISTENCE_MODE = "postgres";
    await getPrismaAdmin().organization.create({
      data: {
        id: orgId,
        name: "Integration Org",
        slug: `it-${Date.now()}`,
        aiBudgetUsd: 10
      }
    });
    controller = new ContactsController(
      new ContactsService(new PrismaContactsRepository(), new PrismaAuditLogger())
    );
  });

  beforeEach(async () => {
    await runWithTenant(orgId, async () => {
      const { getDb } = await import("@/lib/prisma");
      await getDb().contact.deleteMany({ where: { organizationId: orgId } });
      await getDb().auditEvent.deleteMany({ where: { organizationId: orgId } });
    });
  });

  afterAll(async () => {
    await runWithTenant(orgId, async () => {
      const { getDb } = await import("@/lib/prisma");
      await getDb().auditEvent.deleteMany({ where: { organizationId: orgId } });
      await getDb().contact.deleteMany({ where: { organizationId: orgId } });
    });
    await getPrismaAdmin().organization.deleteMany({ where: { id: orgId } });
    await disconnectPrisma();
  });

  it("creates and lists contacts for a tenant", async () => {
    const created = await controller.post({
      headers: headerReader({
        "x-user-id": "u_it",
        "x-organization-id": orgId,
        "x-role": "admin"
      }),
      async json() {
        return { fullName: "Integration Alice", phone: "+15550009999", tags: ["vip"] };
      }
    });

    expect(created.status).toBe(201);

    const listed = await controller.get(
      headerReader({
        "x-user-id": "u_it",
        "x-organization-id": orgId,
        "x-role": "agent"
      })
    );

    expect(listed.status).toBe(200);
    const data = (listed.body as { data: Array<{ fullName: string; tags: string[] }> }).data;
    expect(data).toHaveLength(1);
    expect(data[0]?.fullName).toBe("Integration Alice");
    expect(data[0]?.tags).toContain("vip");
  });
});
