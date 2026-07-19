# Phase 1 Product Brief — Verbal CRM

**Owner:** Product Owner  
**Status:** Approved for implementation  
**Phase:** 1 (Foundation Platform)

## 1. Problem statement

Customer support and sales teams need a multi-tenant workspace to manage contacts and WhatsApp conversations with strict data isolation, reliable inbound message processing, and auditable AI assistance — without leaking data across organizations.

## 2. In-scope

- Organization-scoped contacts CRUD (list/create; detail read)
- Conversation inbox linked to contacts and phone numbers
- Inbound WhatsApp webhook verification, signature validation hook, idempotent ingestion
- Fast webhook ACK + enqueue background processing
- Outbound free-form messages within Meta 24-hour service window
- Outbound template messages outside the service window (approved templates only)
- Message and conversation list UI for agents
- RBAC: admin, manager, agent
- Audit log for sensitive operations
- AI reply suggestion with per-organization usage metering
- Consistent REST API under `/api/v1`
- Automated tests for tenant isolation, RBAC, and webhook idempotency

## 3. Out-of-scope (Phase 1)

- Real Meta Graph API production credentials wiring (adapter interface + mock)
- Prisma/Neon persistence (interfaces + in-memory runtime; schema ADR notes migration path)
- Billing checkout / payment provider
- Broadcast campaigns and workflow builder UI
- Multi-channel (email/SMS) beyond WhatsApp
- SSO / OAuth (header-based auth context for Phase 1)

## 4. Acceptance criteria

1. Agent in org A cannot list or mutate contacts/conversations belonging to org B.
2. `POST /api/v1/webhooks/whatsapp` validates payload shape, deduplicates by provider message ID, returns quickly, and processes work via queue.
3. Duplicate webhook deliveries create no duplicate messages or AI jobs.
4. Free-form outbound is rejected when outside the 24-hour service window unless an approved template is used.
5. Contact create and outbound send write audit events with organizationId and actor.
6. AI suggest-reply records token usage against the organization before returning a suggestion.
7. Dashboard supports: contacts list/create, inbox, conversation thread, templates view.
8. `npm test` and `npm run build` pass.

## 5. Metrics

- Zero cross-tenant leakage in automated negative tests
- Webhook p95 handler path remains “ack + enqueue” (no inline AI)
- 100% of sensitive writes covered by audit events in unit tests

## 6. Release recommendation

Ship Phase 1 as a runnable vertical product with in-memory adapters suitable for local demos and CI. Gate production on Prisma/RLS swap, real WhatsApp credentials, and managed queue (Upstash).
