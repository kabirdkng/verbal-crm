---
description: "Use when creating or changing business logic, APIs, integrations, webhooks, automations, or analytics features."
applyTo: "**/*.{ts,tsx}"
---
# Testing and Quality Instructions

- Add or update unit tests for domain logic changes.
- Add integration tests for API and database behavior changes.
- Add webhook idempotency tests for inbound message flows.
- Include RBAC and tenant isolation cases in test coverage.
- Add observability assertions when introducing retries, queues, or async workers.
- Keep test names behavior-focused and deterministic.
- Document residual risks when full end-to-end coverage is deferred.
