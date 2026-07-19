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
| `DATABASE_URL` | App role URL | **`verbal_app`** (RLS enforced) |
| `DATABASE_URL_ADMIN` | Owner URL | **`verbal`** for migrate/seed |
| `REDIS_URL` | Redis URL | Required for `redis` queue mode |

### Roles (important)

Postgres image `POSTGRES_USER` is a **superuser** and always bypasses RLS.
The app must connect as **`verbal_app`** (non-superuser).

```bash
# First time on an existing volume:
npm run db:grant-app-role
cp .env.docker .env.local
npm run db:setup   # migrate + seed as admin
```

Default unit tests stay on **memory** so CI needs no Docker.  
Local Docker development uses **postgres + redis** via `.env.docker`.

## Health

`GET /api/v1/health` reports dependency status when modes require them.

## WhatsApp (Meta)

Local default is **mock** (no Graph network calls).

To send real messages:

```bash
# in .env.local
WHATSAPP_MODE=meta
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_APP_SECRET=...
WHATSAPP_REQUIRE_SIGNATURE=true
WHATSAPP_INLINE_DRAIN=false
WHATSAPP_PHONE_NUMBER_MAP={"YOUR_PHONE_NUMBER_ID":"org_demo"}
```

Webhook URL: `https://<host>/api/v1/webhooks/whatsapp`  
Worker drain (prod): `POST /api/v1/workers/drain` with `x-worker-secret`.

See `docs/architecture/ADR-007-WHATSAPP-META.md`.

