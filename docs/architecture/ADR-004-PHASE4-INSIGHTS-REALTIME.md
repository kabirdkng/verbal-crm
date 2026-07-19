# ADR-004: Analytics and realtime

**Status:** Accepted  
**Phase:** 4

## Decision
- Analytics overview aggregates in-process store metrics per organization.
- Realtime uses SSE at `/api/v1/events/stream` consuming domain event bus history cursor.
- AI budget is stored on Organization and editable by admins.
