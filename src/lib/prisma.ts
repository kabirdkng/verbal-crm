import { Prisma, PrismaClient } from "@prisma/client";
import { getTenantOrganizationId, tenantStorage, type TenantStore } from "@/lib/tenant-context";

/** Models that are organization-scoped and subject to tenant injection + RLS. */
export const TENANT_MODELS = new Set([
  "Contact",
  "Conversation",
  "Message",
  "MessageTemplate",
  "Note",
  "Broadcast",
  "AutomationRule",
  "AiUsage",
  "AuditEvent",
  "Membership",
  "VoiceCall"
]);

type TxClient = Prisma.TransactionClient;

const globalForPrisma = globalThis as typeof globalThis & {
  __verbalPrismaAdmin?: PrismaClient;
  __verbalPrismaApp?: PrismaClient;
  __verbalPrisma?: ReturnType<typeof createTenantClient>;
};

function createBaseClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"]
  });
}

function injectOrgWhere(args: { where?: Record<string, unknown> }, organizationId: string) {
  const where = args.where ?? {};
  args.where = { ...where, organizationId };
}

function injectOrgData(
  args: { data?: Record<string, unknown> | Array<Record<string, unknown>> },
  organizationId: string
) {
  if (!args.data) {
    return;
  }
  if (Array.isArray(args.data)) {
    args.data = args.data.map((row) => ({ ...row, organizationId }));
    return;
  }
  args.data = { ...args.data, organizationId };
}

function createTenantClient(base: PrismaClient) {
  return base.$extends({
    name: "tenantIsolation",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async create({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgData(args as { data?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgData(args as { data?: Record<string, unknown>[] }, orgId);
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          const orgId = getTenantOrganizationId();
          if (orgId && TENANT_MODELS.has(model)) {
            injectOrgWhere(args as { where?: Record<string, unknown> }, orgId);
          }
          return query(args);
        }
      }
    }
  });
}

export type TenantPrisma = ReturnType<typeof createTenantClient>;

/**
 * Admin/owner client (migrations helpers, identity bootstrap, test fixtures).
 * Uses DATABASE_URL_ADMIN when set so superuser can manage schema/seed data.
 */
export function getPrismaAdmin(): PrismaClient {
  if (!globalForPrisma.__verbalPrismaAdmin) {
    const adminUrl = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
    globalForPrisma.__verbalPrismaAdmin = createBaseClient(adminUrl);
  }
  return globalForPrisma.__verbalPrismaAdmin;
}

/** App runtime client (non-superuser) — subject to FORCE RLS. */
function getPrismaApp(): PrismaClient {
  if (!globalForPrisma.__verbalPrismaApp) {
    globalForPrisma.__verbalPrismaApp = createBaseClient(process.env.DATABASE_URL);
  }
  return globalForPrisma.__verbalPrismaApp;
}

/**
 * Extended client with application-level org injection.
 * Inside runWithTenant, prefer getDb() which uses the transaction connection for RLS.
 */
export function getPrisma(): TenantPrisma {
  if (!globalForPrisma.__verbalPrisma) {
    globalForPrisma.__verbalPrisma = createTenantClient(getPrismaApp());
  }
  return globalForPrisma.__verbalPrisma;
}

/**
 * Active DB handle: transaction client when inside runWithTenant (RLS GUC set),
 * otherwise the extended Prisma client.
 */
export function getDb(): PrismaClient | TxClient | TenantPrisma {
  const store = tenantStorage.getStore() as (TenantStore & { tx?: TxClient }) | undefined;
  if (store?.tx) {
    return store.tx;
  }
  return getPrisma();
}

/**
 * Run work as a tenant:
 * 1) interactive transaction (same connection)
 * 2) SET LOCAL app.organization_id for Postgres RLS
 * 3) ALS organizationId for Prisma extension injection
 */
export async function runWithTenant<T>(
  organizationId: string,
  fn: () => Promise<T>
): Promise<T> {
  // Use app role connection so FORCE RLS is enforced (superuser always bypasses RLS).
  return getPrismaApp().$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.organization_id', $1, true)`,
      organizationId
    );
    return tenantStorage.run({ organizationId, tx } as TenantStore & { tx: TxClient }, fn);
  });
}

/** System path: no tenant injection (register, login, seed-style ops). */
export async function runAsSystem<T>(fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ organizationId: "", bypass: true }, fn);
}

export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.__verbalPrismaAdmin) {
    await globalForPrisma.__verbalPrismaAdmin.$disconnect();
    globalForPrisma.__verbalPrismaAdmin = undefined;
  }
  if (globalForPrisma.__verbalPrismaApp) {
    await globalForPrisma.__verbalPrismaApp.$disconnect();
    globalForPrisma.__verbalPrismaApp = undefined;
  }
  globalForPrisma.__verbalPrisma = undefined;
}

export function isPostgresMode(): boolean {
  return (
    process.env.PERSISTENCE_MODE === "postgres" ||
    process.env.PERSISTENCE_MODE === "prisma"
  );
}

export type { Prisma };
