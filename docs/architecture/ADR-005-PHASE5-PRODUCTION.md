# ADR-005: Production hardening

**Status:** Accepted  
**Phase:** 5

## Decision
- Rate-limit auth endpoints via in-memory buckets (swap for Redis/Upstash in multi-instance).
- Feature flags global or org-scoped; gates broadcasts/automations/analytics/realtime.
- Worker drain endpoint protected by `WORKER_DRAIN_SECRET`.
- Prisma schema + RLS SQL shipped; runtime remains memory until DATABASE_URL wired.
- Production disables header auth unless `AUTH_ALLOW_HEADERS=true`.
