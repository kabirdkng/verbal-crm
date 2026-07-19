# Sprint 1 Task Plan — Phase 1 Full Vertical Slice

**Owners:** Scrum Master + Tech Lead  
**Definition of Done:** All acceptance criteria in PHASE1_PRODUCT_BRIEF met; tests + build green.

## Work packages

| ID | Owner role | Task | Depends on |
|----|------------|------|------------|
| T1 | Tech Lead | Shared store, events, queue, error/auth helpers | ADR-001 |
| T2 | Full Stack | Contacts module harden + get-by-id | T1 |
| T3 | Full Stack | Conversations + messages modules | T1, T2 |
| T4 | Backend Integrations | WhatsApp webhook, templates, service window | T1, T3 |
| T5 | Backend Integrations / AI | AI adapter + usage metering + suggest API | T1, T3 |
| T6 | Frontend UX | Dashboard: contacts, inbox, thread, settings | T2–T5 APIs |
| T7 | QA Automation | Tenant, RBAC, idempotency, service-window tests | T2–T5 |
| T8 | DevOps | CI workflow, env sample, release checklist | T7 |

## Quality gates
- Unit/integration tests for services and controllers
- Cross-tenant negative cases
- Webhook duplicate delivery cases
- `npm test` && `npm run build`

## Handoffs
- T4 → T7: webhook edge cases documented
- T6 → Manual UAT: journey scripts in `docs/uat/`
- T8 → PO: release readiness packet
