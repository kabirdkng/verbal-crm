# ADR-008: WhatsApp background worker

**Status:** Accepted  
**Date:** 2026-07-20

## Decision
1. Webhook path remains **ack + enqueue only** in production (`WHATSAPP_INLINE_DRAIN=false`).
2. Processing runs in a dedicated worker:
   - Continuous: `npm run worker` / Docker `worker` profile
   - One-shot/cron: `npm run worker:once` or `POST /api/v1/workers/drain`
3. Worker reuses composition root (`appContainer`) so tenant RLS, adapters, and automations match the API.
4. Redis queue supports optional `BLPOP` via `WORKER_BLOCKING_POP_SECONDS` to reduce idle polling.

## Ops
| Command | Use |
|---------|-----|
| `npm run worker` | Local long-running process |
| `npm run worker:once` | Cron / CI one-shot drain |
| `npm run docker:worker` | Containerized worker |
| `POST /api/v1/workers/drain` | HTTP cron with `x-worker-secret` |

## Graceful shutdown
Worker handles SIGINT/SIGTERM, finishes current batch loop iteration, disconnects Redis/Prisma.
