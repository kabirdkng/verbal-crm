# Build and test (verified 2026-07-20, Docker local)

## Commands
```bash
npm install
npm run docker:up          # requires Docker daemon
cp .env.docker .env.local
npm run db:migrate
npm run db:seed
npm run dev

npm test                   # unit (memory) — 22 tests
npm run test:integration   # needs PERSISTENCE_MODE=postgres + Docker Postgres
npm run build
```

## Docker services
- postgres:16 → localhost:5432 (user/pass/db: verbal/verbal/verbal_crm)
- redis:7 → localhost:6379
- optional app profile: `npm run docker:app`

## Modes
- `PERSISTENCE_MODE=memory` (default unit tests)
- `PERSISTENCE_MODE=postgres` + `DATABASE_URL`
- `QUEUE_MODE=memory` | `redis` + `REDIS_URL`

## Demo credentials
- admin@demo.local / demo-password
- org_demo

## CI
- Unit tests do not require Docker
- Integration tests should run in a job with postgres service
