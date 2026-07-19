# ADR-009: SpaceXAI / xAI provider for reply suggestions

**Status:** Accepted  
**Date:** 2026-07-20

## Decision
1. Default AI mode remains **`mock`** for zero-config local/CI.
2. Production mode **`AI_MODE=xai`** uses xAI OpenAI-compatible Chat Completions:
   - Base URL: `https://api.x.ai/v1`
   - Key: `XAI_API_KEY` (server-side only)
   - Default model: `grok-4.5`
3. Token usage is taken from the API `usage` object when present; cost is estimated from configurable $/1M rates.
4. Failures are audited as `ai.suggest_reply_failed` and returned as typed AppError (502/504/500).
5. Org budget pre-check remains in `AiService` before the provider call.

## Why SpaceXAI/xAI
Project AI skill defaults to SpaceXAI (xAI API). OpenAI-compatible surface keeps the adapter thin and swappable.

## Config
| Env | Purpose |
|-----|---------|
| `AI_MODE` | mock \| xai |
| `XAI_API_KEY` | API key |
| `XAI_BASE_URL` | default https://api.x.ai/v1 |
| `XAI_MODEL` | default grok-4.5 |
| `XAI_INPUT_USD_PER_1M` | cost estimate input |
| `XAI_OUTPUT_USD_PER_1M` | cost estimate output |
| `XAI_MAX_TOKENS` | completion cap |
| `XAI_TIMEOUT_MS` | request timeout |
