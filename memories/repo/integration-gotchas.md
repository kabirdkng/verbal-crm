# Integration gotchas

## WhatsApp
- Delivery is at-least-once; always key idempotency on provider message `id`.
- Duplicate ingest returns `accepted: true, duplicate: true` and does not re-enqueue.
- Worker also no-ops if message with same `providerMessageId` already exists.
- Phase 1 route drains the in-process queue after building a 200 ack for local demo reliability; production must use async workers only.
- Meta verify: GET `hub.mode=subscribe` + matching `hub.verify_token` returns plain-text `hub.challenge`.
- Simplified test payload `{ organizationId, message: { id, from, text, profileName } }` is supported alongside Meta envelope.

## Tenant / store
- In-memory store is process-local — not safe across serverless instances or multi-replica.
- Hot reload can reset or retain store depending on `globalThis` survival; do not rely on data across restarts.
- Cross-tenant reads return NOT_FOUND (not empty list with leak) for get-by-id paths.

## Service window
- Window opens only after inbound (`lastInboundAt`). Brand-new outbound threads need templates until first inbound.

## AI
- Budget check uses cumulative `estimatedCostUsd` per organization before calling provider.
- Agents can suggest-reply; only admin/manager can list `/api/v1/ai/usage`.

## UI
- Client calls must send auth headers via `src/ui/api-client.ts` + session context.
- Webhook simulate on Inbox uses `x-organization-id` only (no user RBAC on public webhook).
