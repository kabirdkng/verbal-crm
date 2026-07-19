# Integration gotchas

## Auth
- Cookie session wins when present and unexpired.
- Header auth disabled in production unless AUTH_ALLOW_HEADERS=true.
- SSE EventSource cannot send custom headers — needs cookie session for live stream.

## WhatsApp
- Idempotency key = provider message id.
- Automations run only in worker after persist.
- Phase 1 drain-after-ack remains for local demo; production should use `/workers/drain` or managed queue.

## Broadcasts
- Only approved templates; optional tag filter on contact.tags.

## AI
- Budget read from Organization record when present.
- Agents can suggest; usage list is admin/manager.

## Store
- In-memory not multi-instance safe.
- ensureDemoSeed hashes demo password once per process; resetStore in tests clears data but seed flag may skip re-hash until process restart — tests create their own users.
