# Build and test (RLS-aware Docker)

```bash
npm install
npm run docker:up
npm run db:grant-app-role   # once per volume
cp .env.docker .env.local
npm run db:setup            # admin migrate + seed
npm run dev                 # app uses verbal_app + RLS
npm run worker              # WhatsApp queue consumer (separate terminal)
# npm run worker:once       # cron-style one-shot
# npm run docker:worker     # containerized worker

npm test                    # unit (memory)
npm run test:integration    # Postgres + RLS
npm run build
```


## Credentials
- Demo: admin@demo.local / demo-password
- DB app: verbal_app / verbal
- DB admin: verbal / verbal

## Pitfall
If integration tests “see” cross-tenant rows, DATABASE_URL is probably still the superuser.

## Staging deploy
- Guide: `docs/release/STAGING_DEPLOY.md`
- `vercel.json` cron → `/api/v1/workers/drain` (auth via CRON_SECRET)
- `npm run deploy:check` validates env
- Neon pooled URL → DATABASE_URL; direct → DATABASE_URL_ADMIN for migrate

