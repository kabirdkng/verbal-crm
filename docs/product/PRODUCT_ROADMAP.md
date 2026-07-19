# Verbal CRM Product Roadmap

## Phase 1 — Foundation ✅
Contacts, conversations, WhatsApp ingest, templates, AI metering, audit, dashboard.

## Phase 2 — Identity & persistence ✅
Orgs, users, memberships, sessions, Prisma dual-mode, org AI budget.

## Phase 3 — CRM operations ✅
Notes, assignment, broadcasts, automations (API + base UI).

## Phase 4 — Insights & realtime ✅
Analytics, SSE, budget UI.

## Phase 5 — Production hardening ✅
Rate limits, flags, worker drain, release pack.

## Platform track (parallel) ✅
Docker Postgres/Redis, RLS, Meta WhatsApp, worker process, xAI, staging deploy pack.

---

## Phase 6 — CRM completeness (contacts & notes UX)
- Contact update / delete API + UI
- Contact detail page with notes CRUD UI
- Tags edit on create/update

## Phase 7 — Inbox completeness
- Assign / unassign + status controls in conversation UI
- Inbox filters: status, assigned-to-me, search
- Clear empty/loading/error states

## Phase 8 — Team & org admin
- Invite member (email + role)
- Update member role / remove member
- Org switcher UI for multi-membership users

## Phase 9 — Compliance, ops polish, quality gate
- Org data export (JSON)
- Feature flags admin UI
- Structured request logging helper
- Expanded automated tests + product complete definition
- **No production cloud deploy in this phase** (pack only)

## Deferred (post-complete / Phase 10+)
- Stripe billing checkout
- SSO/OAuth
- Email/SMS channels
- Playwright browser E2E
- Advanced workflow builder / scheduled broadcasts
