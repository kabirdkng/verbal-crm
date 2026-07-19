---
description: "Use when building WhatsApp webhook handlers, message processing, automations, broadcasts, and realtime event delivery. Covers idempotency and service-window constraints."
applyTo: "**/*.{ts,tsx,sql}"
---
# WhatsApp and Events Instructions

- Treat webhook delivery as at-least-once.
- Deduplicate using Meta message ID or idempotency key before downstream processing.
- Webhook handlers must acknowledge quickly and enqueue background work.
- Do not call AI models inline inside webhook handlers.
- Validate 24-hour service window before sending free-form outbound messages.
- Outside service window, require approved template usage.
- Persist webhook logs and event logs with status and retry metadata.
- Model realtime fan-out as an event consumer, not as webhook-handler inline logic.
