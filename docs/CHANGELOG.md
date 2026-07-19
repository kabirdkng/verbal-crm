# Changelog

## 1.4.0 — WhatsApp background worker (2026-07-20)

### Added
- Standalone worker loop: `npm run worker` / `npm run worker:once`
- Docker Compose `worker` profile + `Dockerfile.worker`
- Redis optional blocking pop for efficient idle waits
- Enhanced drain API response (completed/failed/batch stats)
- ADR-008 worker operations guide

## 1.3.0 — Real WhatsApp Meta Cloud API (2026-07-20)

### Added
- `MetaGraphWhatsAppSender` for Graph API text + template sends
- `WHATSAPP_MODE=mock|meta` factory
- Phone number id → organization mapping (`WHATSAPP_PHONE_NUMBER_MAP`)
- Production signature fail-closed + configurable require/inline-drain
- Webhook no longer drains queue in production by default
- ADR-007 + unit tests for signature, Graph sender, config mapping

## 1.2.0 — Tenant RLS + Prisma tenant context (2026-07-20)

### Added
- `runWithTenant` / `withTenantAuth` request-scoped tenant context
- Prisma client extension injecting `organizationId` on tenant models
- FORCE RLS migration + policies (`app.organization_id`)
- App role `verbal_app` (non-superuser) so RLS is enforceable
- Expanded Postgres integration tests (isolation, RLS, webhook, identity)
- ADR-006

## 1.1.0 — Docker local infrastructure (2026-07-20)

### Added
- `docker-compose.yml` with Postgres 16 + Redis 7 (+ optional app profile)
- Dockerfile for full-stack compose profile
- Prisma migrations, seed, and Prisma repository adapters
- Redis job queue (`QUEUE_MODE=redis`)
- Dual mode: `PERSISTENCE_MODE=memory|postgres`
- Integration test suite (`npm run test:integration`)
- `docs/DOCKER.md` and npm scripts: `docker:*`, `db:*`

## 1.0.0 — Full platform Phases 1–5 (2026-07-20)

### Phase 2 — Identity & persistence
- Register/login/logout, cookie sessions, org members, AI budget settings
- Prisma schema + RLS SQL for Postgres/Neon cutover

### Phase 3 — CRM operations
- Contact notes, conversation assignment/status
- Broadcast campaigns (template + optional tag)
- Inbound keyword automations (worker path)

### Phase 4 — Insights & realtime
- Analytics overview API/UI
- SSE domain event stream
- Org budget UI

### Phase 5 — Production hardening
- Auth rate limits, feature flags API
- Worker drain endpoint
- Full release pack and ADRs 002–005

### Quality
- 22 automated tests; CI pipeline; build green

## 0.1.0 — Phase 1 platform
- Contacts, conversations, WhatsApp, templates, AI metering, audit, dashboard
