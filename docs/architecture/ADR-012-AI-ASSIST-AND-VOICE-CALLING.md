# ADR-012: Team-wide AI assist + WhatsApp voice calling

## Status
Accepted (2026-07-20)

## Context
Agents need AI tools that are not admin-only, with clear budget visibility. Product also needs WhatsApp Business **voice calling** (Cloud API Calling) for business- and user-initiated VoIP calls.

## Decision

### AI assist (all tenant roles)
- Roles: **admin, manager, agent** (and platform admin when inside a tenant).
- Unified API: `POST /api/v1/ai/assist` with actions:
  - `suggest_reply`, `improve_draft`, `summarize`, `next_steps`, `translate`
- Tone presets + optional draft/instruction/language.
- `GET /api/v1/ai/budget` and usage list include remaining budget for everyone.
- Legacy `POST /api/v1/ai/suggest-reply` still works.
- Provider: mock (default) or SpaceXAI/xAI via `AI_MODE=xai`.

### WhatsApp voice calling
- Domain: `voice_calls` table (RLS) + in-memory store.
- Client: `MockWhatsAppCallingClient` | `MetaWhatsAppCallingClient` (Graph `/{phone-number-id}/calls`).
- APIs:
  - `POST /api/v1/calls` — business-initiated call
  - `POST /api/v1/calls/permission-request` — interactive call permission message
  - `GET /api/v1/calls` — list (filter by conversation/contact)
  - `POST /api/v1/calls/:id/terminate|accept|reject`
- Webhooks: `field=calls` handled in WhatsApp ingest (status/connect/terminate).
- UI: conversation page — call controls, permission request, history; AI assist sidebar.

### Modes
| Mode | Behavior |
|------|----------|
| `WHATSAPP_MODE=mock` | Simulated call lifecycle (active immediately); no SDP required |
| `WHATSAPP_MODE=meta` | Real Graph Calling API; SDP offer required for media connect |

Full browser WebRTC softphone media plane is optional: mock demos call state in-app; Meta live media needs client-generated SDP.

## Consequences
- Every agent can use AI with budget awareness.
- Calling is first-class CRM data (audit + thread system messages).
- Production Meta calling still requires Meta-side enablement, messaging limits, and user call permissions.
