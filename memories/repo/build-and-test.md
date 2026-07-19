# Build and test (verified 2026-07-20, Phases 1–5)

## Commands
```bash
npm install
npm run dev
npm test         # 22 tests
npm run build
```

## Demo credentials
- admin@demo.local / demo-password
- org_demo

## CI
`.github/workflows/ci.yml` — npm ci → test → build

## Test rules
- `src/**/*.test.ts`
- `resetStore()` in beforeEach for store-backed tests
- Header auth still used in unit tests
