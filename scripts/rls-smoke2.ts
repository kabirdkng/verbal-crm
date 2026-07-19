import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const r = await p.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.organization_id', $1, true)`, "org_demo");
    const guc = await tx.$queryRawUnsafe(
      `SELECT current_setting('app.organization_id', true) as v`
    );
    const rows = await tx.$queryRawUnsafe(
      `SELECT id, organization_id, full_name FROM contacts LIMIT 10`
    );
    const viaModel = await tx.contact.findMany({ take: 10 });
    return { guc, rows, viaModelCount: viaModel.length, viaModelOrgs: viaModel.map((c) => c.organizationId) };
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
