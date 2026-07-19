# Staging deploy guide — Vercel + Neon + Upstash

## Architecture

```
Meta webhooks ──► Vercel (Next.js API)
                      │
                      ├─► Neon Postgres (Prisma + RLS)
                      │
                      └─► Upstash Redis (queue)
                              ▲
Vercel Cron (every minute) ───┘  POST /api/v1/workers/drain
```

Optional: long-running worker on Railway/Fly/Docker instead of Cron.

## 1) Neon Postgres

1. Create project at https://console.neon.tech
2. Create database `verbal_crm`
3. Create roles:
   - **owner** (migrations): full privileges
   - **app** (runtime): no BYPASSRLS (or use single role carefully; FORCE RLS still needs non-superuser)
4. Copy:
   - **Pooled** connection string → `DATABASE_URL` (app / Vercel)
   - **Direct** connection string → `DATABASE_URL_ADMIN` (migrate/seed)

From laptop (with admin URL):

```bash
export DATABASE_URL_ADMIN='postgresql://...neon.tech/verbal_crm?sslmode=require'
export DATABASE_URL="$DATABASE_URL_ADMIN"   # for this one-time setup if needed
npx prisma migrate deploy
npx prisma db seed
# Apply RLS is already in migrations (20260720010000_*)
```

If you use a separate non-superuser app role on Neon, grant table privileges similar to `scripts/grant-app-role.sql`.

## 2) Upstash Redis

1. Create database at https://console.upstash.com
2. Copy Redis URL → `REDIS_URL`  
   Example: `rediss://default:****@****.upstash.io:6379`

## 3) Vercel project

```bash
npm i -g vercel
vercel login
vercel link          # create/link project "verbal-crm"
```

Set env vars in Vercel dashboard (Preview = staging, Production = prod) using `.env.staging.example` as the checklist.

Important staging values:

| Variable | Staging value |
|----------|----------------|
| `PERSISTENCE_MODE` | `postgres` |
| `QUEUE_MODE` | `redis` |
| `AUTH_ALLOW_HEADERS` | `false` |
| `WHATSAPP_INLINE_DRAIN` | `false` |
| `WHATSAPP_REQUIRE_SIGNATURE` | `true` (if Meta secret set) |
| `CRON_SECRET` | long random string |
| `WORKER_DRAIN_SECRET` | same as CRON_SECRET (or distinct) |

Deploy:

```bash
vercel --prod=false    # preview/staging URL
# or
vercel --prod          # production
```

Build uses `vercel.json` → `prisma generate && next build`.

## 4) Worker via Vercel Cron

`vercel.json` schedules:

```
* * * * *  →  POST /api/v1/workers/drain
```

Vercel injects `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set.  
The drain route accepts `CRON_SECRET` or `WORKER_DRAIN_SECRET`.

Verify:

```bash
curl -X POST "https://YOUR_DEPLOYMENT/api/v1/workers/drain" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 5) Meta WhatsApp webhook

Point Meta app webhook to:

```
https://YOUR_DEPLOYMENT/api/v1/webhooks/whatsapp
```

Verify token = `WHATSAPP_VERIFY_TOKEN`.  
Subscribe to `messages`.

## 6) Smoke checklist

1. `GET /api/v1/health` → `postgres: up`, `redis: up` (when modes set)
2. Register or login (`admin@demo.local` only if seed ran)
3. Create contact → open conversation
4. Simulate webhook or send Meta test message
5. Confirm worker cron processes job (messages appear)
6. AI suggest with `AI_MODE=xai` + `XAI_API_KEY`

## 7) Rollback

- Vercel: promote previous deployment
- Neon: restore branch/point-in-time if needed
- Feature flags: disable `broadcasts` / `automations` via API if needed

## Hobby plan notes

- Vercel Cron on Hobby may be limited (e.g. daily only on free tier). Use external cron to hit drain if needed.
- For reliable queue latency, prefer a small always-on worker (`docker:worker` / Railway) with Redis.
