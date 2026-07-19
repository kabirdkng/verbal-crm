# Architecture guardrails (verified)

- Stack: Next.js 15 App Router, TypeScript strict, Zod, Vitest.
- Layers: route handler → controller → service → repository/adapter. No business logic in UI.
- API: REST under `/api/v1`. Error envelope via `AppError` / `toErrorEnvelope`.
- Auth (Phase 1): headers `x-user-id`, `x-organization-id`, `x-role` (`admin`|`manager`|`agent`).
- Tenant: every tenant entity has `organizationId`; services use auth context org, never client override for scope.
- Persistence (Phase 1): shared in-memory `AppStore` (`src/lib/store.ts`) via `globalThis` singleton; `resetStore()` for tests.
- Composition root: `src/modules/app/container.ts`.
- WhatsApp: validate → dedupe by provider message id → persist webhook log → enqueue → ack. Worker creates contact/conversation/message.
- No inline AI in webhook path. AI suggest-reply meters usage and enforces org budget.
- Outbound free-form only inside 24h window (`lastInboundAt`); outside requires approved template.
- Adapters: `WhatsAppSender`, `SignatureValidator`, `AiProvider` — swap for production providers without rewriting services.

## Phase 2 musts (not done)
- Prisma + Neon + Postgres RLS + tenant-safe Prisma extension.
- Managed queue (Upstash); multi-instance safe store.
- Real Meta Graph sender; enforce `WHATSAPP_APP_SECRET` in all envs.
- Replace header auth with real sessions.
