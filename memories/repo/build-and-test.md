# Build and test (RLS-aware Docker)

```bash
npm install
npm run docker:up
npm run db:grant-app-role   # once per volume
cp .env.docker .env.local
npm run db:setup            # admin migrate + seed
npm run dev                 # app uses verbal_app + RLS

npm test                    # 22 unit (memory)
npm run test:integration    # 6 tests (Postgres + RLS)
npm run build
```

## Credentials
- Demo: admin@demo.local / demo-password
- DB app: verbal_app / verbal
- DB admin: verbal / verbal

## Pitfall
If integration tests “see” cross-tenant rows, DATABASE_URL is probably still the superuser.
