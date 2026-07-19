import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const orgA = "org_rls_a2";
const orgB = "org_rls_b2";

async function main() {
  await p.organization.createMany({
    data: [
      { id: orgA, name: "A", slug: "rls-a2-" + Date.now(), aiBudgetUsd: 1 },
      { id: orgB, name: "B", slug: "rls-b2-" + Date.now(), aiBudgetUsd: 1 }
    ],
    skipDuplicates: true
  });

  await p.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.organization_id', $1, true)`, orgA);
    await tx.contact.create({
      data: {
        organizationId: orgA,
        fullName: "RLS Test2",
        phone: "+1888" + Date.now(),
        tags: []
      }
    });
  });

  const asB = await p.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.organization_id', $1, true)`, orgB);
    return tx.contact.findMany({ where: { fullName: "RLS Test2" } });
  });
  console.log("asB count", asB.length);

  const asA = await p.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.organization_id', $1, true)`, orgA);
    return tx.contact.findMany({ where: { fullName: "RLS Test2" } });
  });
  console.log("asA count", asA.length);

  try {
    await p.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${orgA}, true)`;
      console.log("tagged ok");
    });
  } catch (e) {
    console.log("tagged failed", (e as Error).message.slice(0, 250));
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
