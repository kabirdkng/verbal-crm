# ADR-002: Identity, sessions, and persistence path

**Status:** Accepted  
**Phase:** 2

## Decision
1. Model `User`, `Organization`, `Membership`, `Session` in shared store (and Prisma schema).
2. Prefer cookie session (`verbal_session`) for browser; retain header auth for API tests/tools when `AUTH_ALLOW_HEADERS=true` (default in non-production).
3. Ship Prisma schema + RLS SQL for Postgres/Neon; default runtime remains in-memory until `DATABASE_URL` is configured and Prisma client is generated.
4. Password hashing via Node `scrypt`; never store plaintext.

## Alternatives
- OAuth-only: deferred (SSO later)
- Prisma-only from day one: breaks zero-config CI without DB
