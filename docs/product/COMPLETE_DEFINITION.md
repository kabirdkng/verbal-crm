# Product complete definition (pre-deploy)

**Status:** Phases 1–9 complete for application functionality  
**Deploy:** still opt-in after this gate (`docs/release/STAGING_DEPLOY.md`)

## Included
- Multi-tenant CRM: contacts (CRUD, tags, notes, search), inbox (filters, assign, status), messages
- WhatsApp: webhook, signature, Meta Graph send mode, worker, automations, broadcasts
- Identity: register/login/session, invite members, roles, org switcher
- AI: mock + xAI suggest-reply with budget metering
- Analytics, audit, feature flags, org data export
- Docker Postgres/Redis, RLS, dual-mode persistence
- Tests: unit + integration suites green

## Explicitly deferred (not blocking “complete app”)
- Live cloud provisioning (Neon/Upstash/Vercel accounts)
- Stripe billing checkout
- SSO/OAuth
- Email/SMS channels
- Browser Playwright E2E suite
- Advanced workflow builder / scheduled campaigns

## Quality gate
```bash
npm test
npm run test:integration   # with Docker postgres/redis
npm run build
```
