# ADR-013: Vapi AI voice agent + tenant context

## Status
Accepted (2026-07-20)

## Context
Tenants need an **AI voice agent** that:
1. Speaks with **their** company context (persona, knowledge, first message, voice).
2. Can **call contacts** outbound (and power chat assist with the same context).
3. Works in zero-config **mock** mode for local demos, and **Vapi** in production.

## Decision

### Tenant config (`voice_agent_configs`)
Per organization (admins write; all roles read):
- `systemPrompt`, `knowledgeBase`, `firstMessage`, `agentName`, `companyName`
- Voice: `voiceProvider`, `voiceId`, `language`, `model`
- Optional tenant overrides: `vapiApiKey`, `vapiPhoneNumberId`, `vapiAssistantId`
- Platform fallbacks: `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`

API: `GET|PATCH /api/v1/org/voice-agent`

### Outbound calls
`POST /api/v1/calls` with `channel: "vapi" | "whatsapp"` (default whatsapp).

Vapi path:
1. Load tenant voice config.
2. Build transient assistant from context + contact name + recent CRM thread.
3. `POST https://api.vapi.ai/call` with `phoneNumberId` + `customer.number` + `assistant` (or `assistantId` + overrides).
4. Store `voice_calls` with `channel=vapi`, `provider=vapi`.
5. Optional end-of-call webhook → summary on call + conversation message.

### Chat parity
`AiService.assist` injects the same tenant persona/knowledge into instruction so inbox AI replies match the voice agent.

### Modes
| `VAPI_MODE` | Behavior |
|-------------|----------|
| `mock` | Simulated call ids; full product flow without network |
| `vapi` | Real Vapi REST API |

Webhook: `POST /api/v1/webhooks/vapi` (+ optional `VAPI_WEBHOOK_SECRET`).

## UI
- **Settings → AI voice agent (Vapi)** — full context editor
- **Inbox conversation** — “AI voice call (Vapi)”
- **Contact detail** — “Call with Vapi”

## Consequences
- Tenants own agent knowledge without redeploying code.
- Secrets never returned in full on GET (`hasVapiApiKey` only).
- WhatsApp calling remains separate channel for Meta VoIP.
