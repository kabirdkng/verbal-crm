# Verbal CRM

Multi-tenant, AI-first customer communication platform — **Phases 1–5 complete**.

## What you get

| Phase | Capability |
|-------|------------|
| 1 | Contacts, inbox, WhatsApp webhooks, templates, AI suggest, audit |
| 2 | Session auth, orgs/users/members, Prisma schema + RLS |
| 3 | Notes, assignment, broadcasts, automations |
| 4 | Analytics, SSE realtime, org AI budget |
| 5 | Rate limits, feature flags, worker drain, production pack |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login:** `admin@demo.local` / `demo-password`

```bash
npm test
npm run build
```

## Architecture

```
Route → Controller → Service → Repository / Adapter
```

- Default runtime: in-memory store (zero-config)
- Production path: `prisma/schema.prisma` + `prisma/rls.sql` on Neon
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

## Production cutover

See `docs/release/FULL_PLATFORM_RELEASE.md`.
