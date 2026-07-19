---
description: "Use when implementing API routes, services, repositories, adapters, and domain modules for Verbal CRM."
applyTo: "**/*.{ts,tsx}"
---
# API and Service Architecture Instructions

- Keep business logic in service layer, not in route handlers or UI components.
- Route handler responsibilities: auth, input parsing, validation, response mapping.
- Service responsibilities: orchestration, policy checks, domain rules.
- Repository responsibilities: persistence only, with tenant-safe access patterns.
- Put external providers (WhatsApp, AI, billing, realtime) behind adapter interfaces.
- Use Zod schemas for request/response contracts and shared package validation.
- Keep REST endpoints versioned under /api/v1.
- Return consistent typed error envelopes and map provider errors safely.
