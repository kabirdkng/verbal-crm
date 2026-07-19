import { AsyncLocalStorage } from "node:async_hooks";

export type TenantStore = {
  organizationId: string;
  /** When true, Prisma extension skips org injection (migrations/seed/system). */
  bypass?: boolean;
  /** Interactive transaction client so SET LOCAL applies to the same connection. */
  tx?: unknown;
};

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantOrganizationId(): string | undefined {
  const store = tenantStorage.getStore();
  if (!store || store.bypass) {
    return undefined;
  }
  return store.organizationId;
}

export function isTenantBypass(): boolean {
  return Boolean(tenantStorage.getStore()?.bypass);
}
