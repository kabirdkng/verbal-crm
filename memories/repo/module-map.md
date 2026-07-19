# Module map (Phases 1–5)

| Path | Responsibility |
|------|----------------|
| `src/lib/*` | auth, password, rate-limit, feature-flags, store, queue, events, service-window |
| `src/modules/identity` | register/login/session/org settings/members |
| `src/modules/contacts` | contacts + tags |
| `src/modules/notes` | contact notes |
| `src/modules/conversations` | inbox + assign + status |
| `src/modules/messages` | inbound/outbound + window rules |
| `src/modules/templates` | message templates |
| `src/modules/whatsapp` | webhook, signature, sender, worker |
| `src/modules/automations` | keyword rules (worker-fired) |
| `src/modules/broadcasts` | template campaigns |
| `src/modules/ai` | suggest-reply + usage |
| `src/modules/analytics` | overview metrics |
| `src/modules/app/container.ts` | DI root |
| `app/api/v1/*` | routes |
| `app/{login,register,contacts,inbox,broadcasts,automations,analytics,team,settings}` | UI |
| `src/modules/export` | Org data export |
| `prisma/schema.prisma` + `rls.sql` | Postgres target |
| `memories/repo` | agent operational memory |
