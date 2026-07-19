# ADR-010: Staging deployment topology

**Status:** Accepted  
**Date:** 2026-07-20

## Decision
1. **App**: Vercel (Next.js App Router serverless)
2. **DB**: Neon Postgres with Prisma migrations + FORCE RLS
3. **Queue**: Upstash Redis (`QUEUE_MODE=redis`)
4. **Worker**: Vercel Cron → `POST /api/v1/workers/drain` (or external always-on worker)
5. **Secrets**: Vercel env (Preview = staging, Production = prod); never commit

## Rationale
- Matches stack defaults in copilot instructions (Vercel + Neon + Upstash).
- Serverless-friendly with pooled Neon + Redis.
- Cron drain avoids requiring a separate always-on process for MVP staging.

## Trade-offs
- Cron minimum interval and plan limits may delay job processing vs dedicated worker.
- Prisma interactive transactions for RLS work on serverless but keep batch sizes small (`WORKER_BATCH_SIZE`).
