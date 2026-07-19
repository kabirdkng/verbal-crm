# Module map

| Path | Responsibility |
|------|----------------|
| `src/lib/*` | auth, errors, audit, store, queue, events, service-window, phone, ids |
| `src/modules/contacts` | contact CRUD contracts/service/repo |
| `src/modules/conversations` | inbox threads + serviceWindowOpen |
| `src/modules/messages` | list/send outbound; window + template rules |
| `src/modules/templates` | approved template registry |
| `src/modules/whatsapp` | signature, ingest, worker, mock sender |
| `src/modules/ai` | mock provider, usage repo, suggest service |
| `src/modules/audit` | list audit events API |
| `src/modules/app/container.ts` | DI / composition root |
| `src/ui/*` | session, shell, api client |
| `app/api/v1/*` | thin route handlers |
| `app/{contacts,inbox,settings}` | dashboard pages |
| `docs/product` | product briefs |
| `docs/architecture` | ADRs + sprint plans |
| `docs/uat` | UAT packets |
| `docs/release` | checklists + delivery verdicts |
| `memories/repo` | operational memory for future agents |
| `.github/agents` | role agents |
| `.github/skills` | delivery / tenant / webhook skills |
