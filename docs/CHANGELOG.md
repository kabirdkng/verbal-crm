# Changelog

## 0.1.0 — Phase 1 platform (2026-07-20)

### Added
- Multi-tenant contacts, conversations, messages APIs
- WhatsApp webhook verification, signature hook, idempotent ingest + worker
- Templates and 24-hour service window enforcement
- AI suggest-reply with per-org usage metering and budget gate
- Audit log API and dashboard views
- Dashboard UI: overview, contacts, inbox, conversation thread, settings
- Agent harness (`.github/agents`, skills, instructions)
- Product brief, ADR-001, sprint plan, UAT packet, release checklist
- Repo memory under `memories/repo`
- CI workflow (test + build)

### Notes
- Persistence is in-memory for local/demo; not multi-instance production ready
