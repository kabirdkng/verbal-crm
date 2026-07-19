---
name: whatsapp-webhook-idempotency
description: "Use when implementing or reviewing WhatsApp webhook ingestion, event processing, retries, and dedup logic for at-least-once delivery."
---
# WhatsApp Webhook Idempotency Skill

## Use When
- Building inbound webhook handlers
- Adding message/event processing logic
- Debugging duplicate automations or duplicate AI runs

## Required Outcomes
1. Webhook handler validates signature and acks quickly.
2. Handler persists log and enqueues background work.
3. Processing path deduplicates by provider message ID or idempotency key.
4. Downstream consumers are idempotent and retry-safe.

## Checklist
- Verify no inline long-running AI in webhook request path.
- Verify event log records first-seen and duplicate-seen behavior.
- Verify retries do not create duplicate messages, notes, or automations.
- Verify realtime updates consume processed events, not raw duplicate webhooks.

## Output Format
1. Flow overview
2. Idempotency key strategy
3. Retry and failure behavior
4. Test scenarios
5. Observability fields
