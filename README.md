# Verbal CRM

Multi-tenant, AI-first customer communication platform with strict tenant isolation, WhatsApp event ingestion, and production-shaped architecture.

Phase 1 is a **runnable full vertical slice**: contacts, inbox, WhatsApp webhooks, templates, AI suggest-reply metering, audit log, and dashboard UI.

## Architecture

```
Route handler → Controller → Service → Repository / Adapter
```

- **Stack:** Next.js 15, TypeScript strict, Zod contracts, Vitest
- **Persistence (Phase 1):** shared in-memory `AppStore` (interfaces ready for Prisma + Neon)
- **Queue (Phase 1):** in-process job queue (ready for Upstash)
- **WhatsApp:** ack-and-enqueue ingest + idempotent worker
- **Auth (Phase 1):** header-based auth context + RBAC

See:

- `docs/product/PHASE1_PRODUCT_BRIEF.md`
- `docs/architecture/ADR-001-PHASE1-PLATFORM.md`
- `docs/DEVELOPMENT_HARNESS.md`
- `.github/agents/` and `.github/skills/`

## Features

| Area | Capability |
|------|------------|
| Contacts | Create/list/get, tenant-scoped |
| Conversations | Inbox, open threads, service-window flag |
| Messages | Inbound (webhook) + outbound free-form/template |
| WhatsApp | Verify + POST webhook, signature hook, idempotency |
| Templates | Approved templates for outside 24h window |
| AI | Suggest reply + per-org usage metering + budget |
| Audit | Sensitive action trail |
| UI | Overview, Contacts, Inbox, Thread, Settings |

## API (`/api/v1`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Liveness |
| GET/POST | `/contacts` | List / create |
| GET | `/contacts/:id` | Tenant-safe get |
| GET/POST | `/conversations` | List / open |
| GET | `/conversations/:id` | Detail |
| GET/POST | `/conversations/:id/messages` | List / send |
| GET/POST | `/templates` | List / create |
| GET/POST | `/webhooks/whatsapp` | Meta verify + ingest |
| POST | `/ai/suggest-reply` | Metered suggestion |
| GET | `/ai/usage` | Admin/manager |
| GET | `/audit` | Admin/manager |

### Auth headers

```http
x-user-id: u_1
x-organization-id: org_demo
x-role: admin | manager | agent
```

### Create contact

```bash
curl -X POST http://localhost:3000/api/v1/contacts \
  -H "content-type: application/json" \
  -H "x-user-id: u_1" \
  -H "x-organization-id: org_demo" \
  -H "x-role: admin" \
  -d '{"fullName":"Alice","phone":"+15551234567","email":"alice@example.com"}'
```

### Simulate WhatsApp inbound

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/whatsapp \
  -H "content-type: application/json" \
  -H "x-organization-id: org_demo" \
  -d '{
    "organizationId":"org_demo",
    "message":{
      "id":"wamid_demo_1",
      "from":"+15559876543",
      "text":{"body":"Hi, I need help"},
      "profileName":"Sam"
    }
  }'
```

Replaying the same `message.id` is idempotent (no duplicate messages).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the sidebar session controls to change org/role.

```bash
npm test
npm run build
```

## Agents and delivery workflow

Use **Delivery Orchestrator** (`.github/agents/delivery-orchestrator.agent.md`) as the entrypoint. Role agents cover product, architecture, engineering, QA, UAT, and DevOps. Skills:

- `feature-delivery-e2e`
- `tenant-safety-enforcement`
- `whatsapp-webhook-idempotency`

## Docs, memory, and git

| Concern | Location |
|---------|----------|
| Product / ADR / UAT / release | `docs/` |
| Operational memory for agents | `memories/repo/` |
| Memory rules | `docs/REPO_MEMORY_PLAYBOOK.md` |
| Git commit conventions | `docs/GIT_AND_MEMORY.md` |
| Changelog | `docs/CHANGELOG.md` |

When implementing features, update **docs + memories + git commits** in the same flow—not only code.

## Phase 2 targets

- Prisma tenant-safe repositories + Postgres RLS on Neon
- Managed queue (Upstash) and realtime fan-out (Ably/Pusher)
- Real Meta Graph API sender + signature enforcement in all envs
- Session-based auth (replace demo headers)
