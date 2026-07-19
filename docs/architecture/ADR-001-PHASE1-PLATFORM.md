# ADR-001: Phase 1 Platform Architecture

**Owner:** Technical Architect  
**Status:** Accepted  
**Date:** 2026-07-20

## 1. Context

Verbal CRM must deliver a multi-tenant, event-driven communication platform with WhatsApp ingestion, conversation UX, RBAC, audit, and AI metering. Phase 1 must run without external cloud dependencies while preserving production-shaped boundaries.

## 2. Proposed design

### Stack
- Next.js 15 App Router, TypeScript strict, Zod contracts
- Layers: route handler → controller → service → repository / adapter
- In-memory shared `AppStore` as persistence for Phase 1
- In-process queue for webhook background work
- REST under `/api/v1`

### Tenant isolation
- Every tenant-scoped entity includes `organizationId`
- Repositories accept organization scope on every query/mutation
- Service layer never trusts client-supplied organizationId over auth context
- Negative tests prove cross-tenant isolation
- Future: Postgres RLS + Prisma tenant extension (non-breaking repository interfaces)

### WhatsApp / events
- Webhook GET: Meta verification challenge
- Webhook POST: parse → validate → idempotency check → persist event log → enqueue → 200
- Idempotency key: provider message ID (`wamid` / `messages[].id`)
- Worker: create/find contact by phone → open/attach conversation → append inbound message → emit domain event
- Outbound: service-window check (last inbound + 24h); else require approved template

### AI
- Adapter interface (`AiProvider`) with deterministic mock implementation
- `AiUsageMeter` persists feature, model, tokens in/out, estimated cost, organizationId
- Suggest-reply never runs inside webhook handler

### Realtime
- Domain events published on in-process bus
- UI uses request/response polling in Phase 1; bus ready for Ably/Pusher consumer later

## 3. Alternatives considered

| Option | Why not for Phase 1 |
|--------|---------------------|
| Prisma + Neon from day one | Blocks zero-config local/CI without secrets |
| Inline AI in webhook | Violates latency and reliability non-negotiables |
| GraphQL | REST-first decision in project instructions |

## 4. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| In-memory data lost on restart | Document; repository interfaces enable Prisma swap |
| Module singleton state in serverless | Phase 1 local/demo only; production uses shared DB/queue |
| Mock WhatsApp signature | Adapter validates when `WHATSAPP_APP_SECRET` set; soft-pass in dev |

## 5. Decision and constraints

- Accept layered architecture with in-memory adapters for Phase 1.
- Ban business logic in React components and thin route handlers.
- All new tenant tables must plan for RLS when migrating to Postgres.
- Webhook path must remain ack-and-enqueue.
