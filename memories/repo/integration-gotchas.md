# Integration gotchas

## Auth
- Cookie session wins when present and unexpired.
- Header auth disabled in production unless AUTH_ALLOW_HEADERS=true.
- SSE EventSource cannot send custom headers — needs cookie session for live stream.

## WhatsApp
- Idempotency key = provider message id.
- Automations run only in worker after persist.
- Local: `WHATSAPP_INLINE_DRAIN=true` drains after ack OR run `npm run worker` with `WHATSAPP_INLINE_DRAIN=false`.
- Production: never inline-drain; run `docker:worker` or cron `worker:once` / HTTP drain.

- `WHATSAPP_MODE=meta` needs `WHATSAPP_ACCESS_TOKEN` + phone number id mapping.
- Production fails closed without `WHATSAPP_APP_SECRET` when signatures required.
- `WHATSAPP_PHONE_NUMBER_MAP={"metaPhoneNumberId":"organizationId"}` routes multi-tenant webhooks.


## Broadcasts
- Only approved templates; optional tag filter on contact.tags.

## AI
- Budget read from Organization record when present.
- Agents can suggest; usage list is admin/manager.

## Store
- In-memory not multi-instance safe.
- ensureDemoSeed hashes demo password once per process; resetStore in tests clears data but seed flag may skip re-hash until process restart — tests create their own users.
