# ADR-007: Real WhatsApp Cloud API integration

**Status:** Accepted  
**Date:** 2026-07-20

## Decision
1. **Sender modes**: `WHATSAPP_MODE=mock|meta`. Meta uses Graph API `POST /{phone-number-id}/messages`.
2. **Signature**: `MetaSignatureValidator` fails closed when `WHATSAPP_REQUIRE_SIGNATURE=true` or `NODE_ENV=production` unless explicitly disabled. Soft-pass only for local demo without secret.
3. **Tenant routing**: `WHATSAPP_PHONE_NUMBER_MAP` JSON maps Meta `phone_number_id` → `organizationId`. Fallback: header/payload/default org.
4. **Webhook path**: validate → dedupe → enqueue → 200. Inline queue drain only when `WHATSAPP_INLINE_DRAIN=true` (default non-production). Production uses `/api/v1/workers/drain` or Redis workers.
5. **Outbound failures**: persist message as `failed`, audit `message.outbound_failed`, return 502 to client.

## Configuration
| Env | Purpose |
|-----|---------|
| `WHATSAPP_MODE` | mock \| meta |
| `WHATSAPP_ACCESS_TOKEN` | Graph permanent/system user token |
| `WHATSAPP_PHONE_NUMBER_ID` | Default send phone number id |
| `WHATSAPP_PHONE_NUMBER_MAP` | `{"phoneNumberId":"organizationId"}` |
| `WHATSAPP_APP_SECRET` | X-Hub-Signature-256 |
| `WHATSAPP_REQUIRE_SIGNATURE` | Force signature validation |
| `WHATSAPP_INLINE_DRAIN` | Drain queue inside webhook POST |
| `WHATSAPP_VERIFY_TOKEN` | Meta subscribe challenge |
| `WHATSAPP_GRAPH_API_VERSION` | default v21.0 |
