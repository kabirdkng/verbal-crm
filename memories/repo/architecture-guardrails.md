# Architecture guardrails (Docker + dual persistence)

- Stack: Next.js 15, TypeScript strict, Zod, Vitest, Prisma 6, ioredis
- Layers: route → controller → service → repository/adapter
- Persistence dual-mode via `PERSISTENCE_MODE`:
  - `memory` — AppStore (unit tests / zero-deps)
  - `postgres` — Prisma repositories (Docker local / production)
- Queue dual-mode via `QUEUE_MODE`:
  - `memory` — InMemoryJobQueue
  - `redis` — RedisJobQueue (Docker redis)
- Auth: cookie sessions resolved from memory or Prisma Session table
- Composition root: `src/modules/app/container.ts`
- Docker: `docker-compose.yml` (postgres, redis, optional app)
- Migrations: `prisma/migrations`
- RLS SQL: `prisma/rls.sql` (apply on Neon after migrate)
