# Verbal CRM

Multi-tenant, AI-first customer communication platform — **v2.0 product complete** (Phases 1–9).

## What you get

| Phase | Capability |
|-------|------------|
| 1 | Contacts, inbox, WhatsApp webhooks, templates, AI suggest, audit |
| 2 | Session auth, orgs/users/members, Prisma schema + RLS |
| 3 | Notes, assignment, broadcasts, automations |
| 4 | Analytics, SSE realtime, org AI budget |
| 5 | Rate limits, feature flags, worker drain, production pack |
| 6 | Contact CRUD UI, notes, tags, search |
| 7 | Inbox filters, assign/status controls |
| 8 | Team invites, roles, org switcher |
| 9 | Export, flags UI, completeness gate |
| Infra | Docker, RLS, Meta WhatsApp, worker, xAI, staging pack |

## Quick start (Docker local — recommended)

Requires Docker Desktop running.

```bash
npm install
npm run docker:up          # Postgres + Redis
npm run db:grant-app-role  # once: create verbal_app (RLS-enforced role)
cp .env.docker .env.local  # app=verbal_app, admin=verbal
npm run db:setup           # migrate + seed as admin
npm run dev                # app uses Postgres RLS + Redis queue
# optional separate terminal:
npm run worker             # process WhatsApp queue (recommended with INLINE_DRAIN=false)
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login:** `admin@demo.local` / `demo-password`

```bash
npm test                   # unit tests (memory mode) — 22
npm run test:integration   # Postgres + RLS (Docker) — 6
npm run build
```

Full Docker guide: [`docs/DOCKER.md`](docs/DOCKER.md)

### Memory-only (no Docker)

```bash
npm install
# leave PERSISTENCE_MODE unset or =memory
npm run dev
```

## Architecture

```
Route → Controller → Service → Repository / Adapter
```

- Local Docker: Postgres + Redis via `docker compose`
- Modes: `PERSISTENCE_MODE=memory|postgres`, `QUEUE_MODE=memory|redis`
- Prisma schema/migrations + `prisma/rls.sql` for Neon production
- Agents/skills: `.github/agents`, `.github/skills`
- Memory: `memories/repo/`
- Docs: `docs/product`, `docs/architecture`, `docs/release`

## Key APIs (`/api/v1`)

Auth: `register`, `login`, `logout`, `me`, `switch-org`  
CRM: `contacts`, `notes`, `conversations`, `messages`, `templates`  
Ops: `broadcasts`, `automations`, `analytics/overview`  
System: `webhooks/whatsapp`, `events/stream`, `workers/drain`, `flags`, `audit`, `ai/*`

Headers (tools/tests when allowed):

```http
x-user-id: u_demo_admin
x-organization-id: org_demo
x-role: admin
```

## Agents

Start with **Delivery Orchestrator**. Follow `docs/DEVELOPMENT_HARNESS.md` and keep `memories/repo` + git history updated every phase.

## Staging / production deploy

**Guide:** [`docs/release/STAGING_DEPLOY.md`](docs/release/STAGING_DEPLOY.md)

```bash
# Validate env before ship
PERSISTENCE_MODE=postgres QUEUE_MODE=redis npm run deploy:check

# Link & deploy (requires vercel login)
npx vercel
```

Stack: **Vercel** (app + cron drain) · **Neon** (Postgres) · **Upstash** (Redis) · Meta + xAI secrets in Vercel env.

Also: `docs/release/FULL_PLATFORM_RELEASE.md`

