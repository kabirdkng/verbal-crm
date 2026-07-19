# Docker local development

## Services

| Service | Image | Host port | Purpose |
|---------|-------|-----------|---------|
| postgres | postgres:16-alpine | 5432 | Primary data store (Prisma) |
| redis | redis:7-alpine | 6379 | Job queue + rate limits (optional mode) |
| app | (optional profile) | 3000 | Next.js app container |

## Quick start (recommended)

Run infrastructure in Docker; app on the host for fast Next.js HMR.

```bash
# 1) Start Postgres + Redis
npm run docker:up

# 2) Copy env and use docker-backed modes
cp .env.docker .env.local

# 3) Migrate + seed
npm run db:migrate
npm run db:seed

# 4) Run app against Docker services
npm run dev
```

Open http://localhost:3000  
Login: `admin@demo.local` / `demo-password`

## Full stack in Docker

```bash
cp .env.docker .env.docker   # already present
docker compose --profile app up --build
```

## Useful commands

```bash
npm run docker:up        # postgres + redis
npm run docker:down      # stop containers
npm run docker:logs      # tail logs
npm run docker:reset     # wipe volumes and restart
npm run db:migrate       # prisma migrate dev
npm run db:seed          # demo org/user/templates
npm run db:studio        # Prisma Studio
npm run test             # unit tests (memory mode)
npm run test:integration # integration tests vs Docker Postgres
```

## Environment modes

| Variable | Values | Meaning |
|----------|--------|---------|
| `PERSISTENCE_MODE` | `memory` \| `postgres` | In-memory store vs Prisma/Postgres |
| `QUEUE_MODE` | `memory` \| `redis` | In-process queue vs Redis list queue |
| `DATABASE_URL` | Postgres URL | Required for `postgres` mode |
| `REDIS_URL` | Redis URL | Required for `redis` queue mode |

Default unit tests stay on **memory** so CI needs no Docker.  
Local Docker development uses **postgres + redis** via `.env.docker`.

## Health

`GET /api/v1/health` reports dependency status when modes require them.
