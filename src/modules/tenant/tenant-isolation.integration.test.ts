import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaAuditLogger } from "@/lib/audit.prisma";
import { disconnectPrisma, getPrismaAdmin, runWithTenant } from "@/lib/prisma";
import { ContactsController } from "@/modules/contacts/http/controller";
import { PrismaContactsRepository } from "@/modules/contacts/repository.prisma";
import { ContactsService } from "@/modules/contacts/service";
import { InMemoryEventBus } from "@/lib/events";
import { InMemoryJobQueue } from "@/lib/queue";
import { MetaSignatureValidator } from "@/modules/whatsapp/adapters/signature";
import { WhatsAppIngestService } from "@/modules/whatsapp/ingest.service";
import { PrismaWebhookEventsRepository } from "@/modules/whatsapp/repository.prisma";
import { WhatsAppInboundWorker } from "@/modules/whatsapp/worker";
import { PrismaConversationsRepository } from "@/modules/conversations/repository.prisma";
import { PrismaMessagesRepository } from "@/modules/messages/repository.prisma";
import { IdentityService } from "@/modules/identity/service";
import { PrismaIdentityRepository } from "@/modules/identity/repository.prisma";

const run = process.env.PERSISTENCE_MODE === "postgres" && Boolean(process.env.DATABASE_URL);

function headers(org: string, role = "admin") {
  return {
    get(name: string) {
      const map: Record<string, string> = {
        "x-user-id": `u_${org}`,
        "x-organization-id": org,
        "x-role": role
      };
      return map[name.toLowerCase()] ?? null;
    }
  };
}

describe.runIf(run)("Postgres tenant isolation + RLS", () => {
  const suffix = Date.now();
  const orgA = `org_a_${suffix}`;
  const orgB = `org_b_${suffix}`;
  let contactsController: ContactsController;

  beforeAll(async () => {
    const admin = getPrismaAdmin();
    await admin.organization.createMany({
      data: [
        { id: orgA, name: "Org A", slug: `a-${suffix}`, aiBudgetUsd: 10 },
        { id: orgB, name: "Org B", slug: `b-${suffix}`, aiBudgetUsd: 10 }
      ]
    });

    contactsController = new ContactsController(
      new ContactsService(new PrismaContactsRepository(), new PrismaAuditLogger())
    );
  });

  afterAll(async () => {
    const admin = getPrismaAdmin();
    for (const orgId of [orgA, orgB]) {
      await admin.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.organization_id', ${orgId}, true)`;
        await tx.auditEvent.deleteMany({ where: { organizationId: orgId } });
        await tx.message.deleteMany({ where: { organizationId: orgId } });
        await tx.conversation.deleteMany({ where: { organizationId: orgId } });
        await tx.contact.deleteMany({ where: { organizationId: orgId } });
        await tx.messageTemplate.deleteMany({ where: { organizationId: orgId } });
      });
      await admin.organization.deleteMany({ where: { id: orgId } });
    }
    await disconnectPrisma();
  });

  it("prevents cross-tenant contact list leakage", async () => {
    const createA = await contactsController.post({
      headers: headers(orgA),
      async json() {
        return { fullName: "Only A", phone: "+15550000001" };
      }
    });
    expect(createA.status).toBe(201);

    await contactsController.post({
      headers: headers(orgB),
      async json() {
        return { fullName: "Only B", phone: "+15550000002" };
      }
    });

    const listA = await contactsController.get(headers(orgA, "agent"));
    const listB = await contactsController.get(headers(orgB, "agent"));

    const aNames = (listA.body as { data: Array<{ fullName: string }> }).data.map((c) => c.fullName);
    const bNames = (listB.body as { data: Array<{ fullName: string }> }).data.map((c) => c.fullName);

    expect(aNames).toEqual(["Only A"]);
    expect(bNames).toEqual(["Only B"]);
  });

  it("blocks get-by-id across tenants", async () => {
    const created = await contactsController.post({
      headers: headers(orgA),
      async json() {
        return { fullName: "Secret A", phone: "+15550000003" };
      }
    });
    const id = (created.body as { data: { id: string } }).data.id;

    const foreign = await contactsController.getById(headers(orgB), id);
    expect(foreign.status).toBe(404);
  });

  it("enforces RLS at the database layer even without app where clause", async () => {
    await runWithTenant(orgA, async () => {
      const { getDb } = await import("@/lib/prisma");
      await getDb().contact.create({
        data: {
          organizationId: orgA,
          fullName: "RLS A",
          phone: "+15550000004",
          tags: []
        }
      });
    });

    // Query as org B should not see org A rows under RLS + set_config
    const leaked = await runWithTenant(orgB, async () => {
      const { getDb } = await import("@/lib/prisma");
      return getDb().contact.findMany({
        where: { fullName: "RLS A" }
      });
    });

    expect(leaked).toHaveLength(0);
  });

  it("processes WhatsApp inbound under tenant scope with idempotency", async () => {
    const queue = new InMemoryJobQueue();
    const webhooks = new PrismaWebhookEventsRepository();
    const contacts = new PrismaContactsRepository();
    const conversations = new PrismaConversationsRepository();
    const messages = new PrismaMessagesRepository();
    const ingest = new WhatsAppIngestService(
      webhooks,
      queue,
      new MetaSignatureValidator(undefined)
    );
    const worker = new WhatsAppInboundWorker(
      contacts,
      conversations,
      messages,
      webhooks,
      new InMemoryEventBus()
    );

    const providerId = `wamid_it_${suffix}`;
    const payload = {
      organizationId: orgA,
      message: {
        id: providerId,
        from: "+15550000099",
        text: { body: "help me please" },
        profileName: "Webhook User"
      }
    };

    const first = await ingest.ingest(JSON.stringify(payload), payload, null, orgA);
    expect(first.duplicate).toBe(false);
    await queue.processAll((job) => worker.handle(job));

    const second = await ingest.ingest(JSON.stringify(payload), payload, null, orgA);
    expect(second.duplicate).toBe(true);

    const listed = await runWithTenant(orgA, async () => {
      return contacts.listByOrganization(orgA);
    });
    expect(listed.some((c) => c.phone.includes("5550000099") || c.phone.includes("15550000099"))).toBe(
      true
    );

    const convos = await runWithTenant(orgA, () => conversations.listByOrganization(orgA));
    expect(convos.length).toBeGreaterThanOrEqual(1);
    const msgs = await runWithTenant(orgA, () =>
      messages.listByConversation(orgA, convos[0]!.id)
    );
    expect(msgs.filter((m) => m.providerMessageId === providerId)).toHaveLength(1);
  });

  it("registers and logs in against Postgres identity tables", async () => {
    const identity = new IdentityService(new PrismaIdentityRepository(), new PrismaAuditLogger());
    const email = `owner_${suffix}@example.test`;

    const registered = await identity.register({
      email,
      password: "secure-pass-99",
      name: "Owner",
      organizationName: `Acme ${suffix}`
    });
    expect(registered.role).toBe("admin");

    const login = await identity.login({
      email,
      password: "secure-pass-99",
      organizationId: registered.organizationId
    });
    expect(login.userId).toBe(registered.userId);

    // cleanup identity org under tenant + admin
    const admin = getPrismaAdmin();
    await admin.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${registered.organizationId}, true)`;
      await tx.auditEvent.deleteMany({ where: { organizationId: registered.organizationId } });
    });
    await admin.session.deleteMany({ where: { userId: registered.userId } });
    await admin.membership.deleteMany({ where: { userId: registered.userId } });
    await admin.user.deleteMany({ where: { id: registered.userId } });
    await admin.organization.deleteMany({ where: { id: registered.organizationId } });
  });
});


