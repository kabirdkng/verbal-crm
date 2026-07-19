# Build and test (verified 2026-07-20)

## Commands
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest run — 17 tests
npm run build    # next build
```

## CI
- Workflow: `.github/workflows/ci.yml` — `npm ci` → `npm test` → `npm run build`.

## Test layout
- `src/**/*.test.ts` only (see `vitest.config.ts`).
- Path alias `@/*` → `src/*`.
- Always `resetStore()` in `beforeEach` when touching repositories/store.

## Demo session defaults
- Org: `org_demo`
- Role: `admin` (UI sidebar)
- Seeded template: `welcome_followup` (approved) for `org_demo` via `seedDemoData()`.

## Env (no secrets in repo)
- Copy `.env.example` → `.env.local` when needed.
- `WHATSAPP_VERIFY_TOKEN` default `verbal-crm-dev`
- `WHATSAPP_APP_SECRET` empty → signature soft-pass (dev only)
- `AI_ORG_BUDGET_USD` default `10`
