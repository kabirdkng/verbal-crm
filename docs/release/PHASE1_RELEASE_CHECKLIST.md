# Phase 1 Release Readiness

**Owner:** DevOps Engineer + Delivery Orchestrator  
**Date:** 2026-07-20

## Quality gates
- [x] Product brief and ADR accepted
- [x] Vertical slice implemented (API + UI + workers)
- [x] Tenant isolation tests
- [x] Webhook idempotency tests
- [x] Service window tests
- [x] AI metering tests
- [ ] CI green on main (run locally: `npm test && npm run build`)

## Runtime configuration (production later)
| Variable | Purpose |
|----------|---------|
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verification |
| `WHATSAPP_APP_SECRET` | X-Hub-Signature-256 validation |
| `WHATSAPP_DEFAULT_ORGANIZATION_ID` | Fallback org mapping for inbound |
| `AI_ORG_BUDGET_USD` | Per-org AI spend ceiling |

## Rollback
- Phase 1 is application-only (in-memory). Rollback = redeploy previous artifact.
- No DB migrations in this phase.
- Feature risk: disable webhook route or set invalid verify token to pause inbound.

## Residual risks
1. In-memory store is not multi-instance safe — block horizontal scale until Prisma/Upstash.
2. Mock WhatsApp sender does not deliver real messages.
3. Header auth is demo-only — replace with real session auth before production.

## Recommendation
**Ready for local/demo and internal dogfood.** Not ready for multi-tenant production traffic until persistence, real auth, and managed queue land.
