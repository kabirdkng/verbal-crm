# Verbal CRM Project Instructions

## Mission
Build a multi-tenant, AI-first customer communication platform with strict tenant isolation, event-driven workflows, and production-grade reliability from Phase 1.

## Non-Negotiables
- Never ship features that can leak cross-tenant data.
- Every tenant-scoped data access must enforce organizationId boundaries.
- Keep webhook handlers fast: acknowledge and enqueue; do not run long AI logic inline.
- Treat WhatsApp webhook delivery as at-least-once and enforce idempotency.
- Keep business logic out of UI components.

## Architecture Defaults
- Stack: Next.js 15, TypeScript strict, Prisma, Neon PostgreSQL, Upstash queue/cache, Vercel.
- API style: REST first under /api/v1.
- Realtime: Ably or Pusher as event-bus consumer.
- Persistence: Neon pooled connections or Prisma Accelerate for serverless safety.
- Validation: shared Zod schemas.
- Layers: route handler -> service -> repository -> Prisma tenant-safe client.

## Tenant Isolation Rules
- Use Postgres RLS as database backstop on all tenant-scoped tables.
- Use Prisma client extension to inject organizationId automatically.
- Ban direct raw prisma model access that bypasses tenant-safe repositories.
- Include tenant-isolation tests for every new repository/service touching tenant data.

## WhatsApp Integration Rules
- Enforce Meta 24-hour window constraints.
- Outside the service window, require approved templates only.
- Persist template approval state per organization.
- Deduplicate inbound webhooks using provider message ID or idempotency key.

## AI Governance
- Log per-organization AI usage (feature, model, token in/out, cost, timestamp).
- Add budget and quota checks before expensive AI operations.
- Make AI behavior configurable per organization and auditable.

## Quality Bar
- Unit tests for business logic.
- Integration tests for APIs, database behavior, and webhook idempotency.
- E2E tests for critical user journeys.
- Add observability hooks (structured logs, audit logs, tracing metadata) with feature work.

## Delivery Workflow
- Work in vertical slices that include schema, service, API, tests, and observability.
- Provide migration notes and rollback considerations for schema changes.
- Document assumptions and unresolved risks in PR descriptions.

## Security and Compliance
- Enforce RBAC on every protected action.
- Maintain audit log coverage for sensitive operations.
- Apply per-tenant rate limiting.
- Validate signatures for external webhooks.
