# ADR-003: CRM operations (notes, assignment, broadcasts, automations)

**Status:** Accepted  
**Phase:** 3

## Decision
- Contact notes are first-class tenant-scoped records with audit on create.
- Conversation assignment and status updates via PATCH API (manager/admin assign).
- Broadcasts send approved templates to all contacts or tag segment via WhatsApp sender adapter.
- Automations run only in the inbound worker after message persist (never in webhook ACK path).
