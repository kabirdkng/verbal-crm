# Architecture guardrails (RLS + Docker)

- Dual persistence: `PERSISTENCE_MODE=memory|postgres`
- Dual queue: `QUEUE_MODE=memory|redis`
- **Postgres roles**
  - `verbal` — superuser/owner; migrate + seed only (`DATABASE_URL_ADMIN`)
  - `verbal_app` — app runtime (`DATABASE_URL`); NOSUPERUSER, NOBYPASSRLS
- **RLS**: FORCE on tenant tables; GUC `app.organization_id` via `runWithTenant`
- **Prisma**: extension injects org filters; `getDb()` uses tx inside tenant scope
- **HTTP**: `withTenantAuth` wraps authenticated handlers
- **Worker**: WhatsApp inbound `runWithTenant(organizationId, ...)`
- Superuser always bypasses RLS — never point app `DATABASE_URL` at `verbal`
- WhatsApp: `WHATSAPP_MODE=mock|meta`; production requires signature; map `phone_number_id` → org; webhook is ack-and-enqueue (no inline drain in prod)
- Worker: `npm run worker` / Docker profile `worker` drains Redis queue; HTTP `/api/v1/workers/drain` for cron
- AI: `AI_MODE=mock|xai`; xAI uses `XAI_API_KEY` + `https://api.x.ai/v1` + model `grok-4.5`; budget enforced per org



