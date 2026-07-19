# ADR-006: Tenant RLS + Prisma tenant context

**Status:** Accepted  
**Date:** 2026-07-20

## Context
Docker Postgres alone is not enough for multi-tenant safety. Superuser connections bypass RLS. Application-level org filters can be forgotten.

## Decision
1. **Application role `verbal_app`** — NOSUPERUSER, NOBYPASSRLS; used by runtime `DATABASE_URL`.
2. **Admin role `verbal`** — owner/superuser for migrations/seed via `DATABASE_URL_ADMIN`.
3. **FORCE ROW LEVEL SECURITY** on tenant tables with `USING` + `WITH CHECK` on `app.organization_id`.
4. **`runWithTenant(orgId, fn)`** — interactive transaction + `set_config(..., true)` + ALS.
5. **Prisma extension** — injects `organizationId` into tenant model queries when ALS is set (defense in depth).
6. **`withTenantAuth`** — HTTP handlers resolve auth then run under tenant scope.

## Non-RLS tables
users, organizations, sessions, memberships, webhook_events (global identity / idempotency).

## Consequences
- Local Docker must grant `verbal_app` (`npm run db:grant-app-role` on existing volumes).
- Integration tests must use app role URL to assert RLS.
