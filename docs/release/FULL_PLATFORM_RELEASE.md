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
1. Provision Neon Postgres; set `DATABASE_URL`
2. `npx prisma migrate dev` / deploy migrations
3. Apply `prisma/rls.sql`
4. Implement Prisma repository adapters (interfaces already stable)
5. Set `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, real Graph credentials
6. Set `WORKER_DRAIN_SECRET`; schedule drain or use managed queue
7. Set `AUTH_ALLOW_HEADERS=false` in production
8. Replace mock AI/WhatsApp adapters with live providers
9. Move rate limits to Redis/Upstash for multi-instance

## Rollback
- Application-only: redeploy previous artifact
- DB: reverse migration if Prisma live
