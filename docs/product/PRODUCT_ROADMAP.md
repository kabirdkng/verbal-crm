# Verbal CRM Product Roadmap

## Phase 1 — Foundation (DONE)
Contacts, conversations, WhatsApp ingest, templates, AI metering, audit, dashboard, header auth.

## Phase 2 — Identity & persistence
- Organizations, users, memberships (RBAC)
- Cookie session auth (login/register/logout)
- Prisma schema + RLS SQL (Postgres-ready); runtime still dual-mode memory default
- Org settings (AI budget, WhatsApp defaults)

## Phase 3 — CRM operations
- Contact notes
- Conversation assignment
- Broadcast campaigns (template outbound to audience)
- Inbound automation rules (keyword → template reply)

## Phase 4 — Insights & realtime
- Server-Sent Events for domain event stream
- Analytics (messages, conversations, AI cost)
- Billing/usage dashboard surfaces
- Org AI budget configuration API/UI

## Phase 5 — Production hardening
- Per-tenant rate limiting
- Feature flags
- Worker drain endpoint (secret-protected)
- Production runbook, env matrix, residual risk closure
- Full memory + changelog + release pack

## Definition of fully done
All phases 1–5 shipped with tests green, docs/memory updated, and git history per phase.
