# Full platform release pack (Phases 1–5)

## Status
**Complete for demo/local and architecture-complete for production cutover.**

## Quality gates
- `npm test`
- `npm run build`

## Demo credentials
- Email: `admin@demo.local`
- Password: `demo-password`
- Organization: `org_demo`

## Production cutover checklist
1. Follow **`docs/release/STAGING_DEPLOY.md`** (Vercel + Neon + Upstash)
2. `DATABASE_URL` (app/pooled) + `DATABASE_URL_ADMIN` (migrate)
3. `npx prisma migrate deploy` + seed; RLS is in migrations
4. `QUEUE_MODE=redis` + Upstash `REDIS_URL`
5. `WHATSAPP_MODE=meta` + secrets; `WHATSAPP_INLINE_DRAIN=false`
6. `CRON_SECRET` / `WORKER_DRAIN_SECRET` for drain cron
7. `AUTH_ALLOW_HEADERS=false`
8. `AI_MODE=xai` + `XAI_API_KEY`
9. `npm run deploy:check` then `vercel deploy`

## Rollback
- Application-only: redeploy previous artifact
- DB: reverse migration if Prisma live
