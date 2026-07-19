# Architecture guardrails (verified Phases 1–5)

- Stack: Next.js 15 App Router, TypeScript strict, Zod, Vitest.
- Layers: route handler → controller → service → repository/adapter. No business logic in UI.
- API: REST under `/api/v1`. Error envelope via `AppError` / `toErrorEnvelope`.
- Auth: cookie session (`verbal_session`) preferred; header auth when `AUTH_ALLOW_HEADERS` allows (default non-prod).
- Tenant: every tenant entity has `organizationId`; services use auth context org.
- Persistence: shared in-memory `AppStore` default; Prisma schema + RLS SQL at `prisma/` for Neon cutover.
- Composition root: `src/modules/app/container.ts` + `ensureDemoSeed()`.
- WhatsApp: validate → dedupe → log → enqueue → ack; worker creates message + runs automations.
- No inline AI in webhook path. AI budget from Organization.aiBudgetUsd.
- Outbound free-form only inside 24h window; else approved template.
- Feature flags gate broadcasts/automations/analytics/realtime.
- Worker drain: `POST /api/v1/workers/drain` + `x-worker-secret`.

## Production cutover (not auto-wired)
- Prisma repositories when DATABASE_URL set
- Real Meta Graph sender + enforced secrets
- Managed queue + multi-instance rate limits
