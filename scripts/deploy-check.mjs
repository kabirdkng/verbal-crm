#!/usr/bin/env node
/**
 * Validates required env for staging/production before deploy.
 * Usage: node scripts/deploy-check.mjs
 */
const mode = process.env.PERSISTENCE_MODE ?? "memory";
const queue = process.env.QUEUE_MODE ?? "memory";
const isProdLike = process.env.NODE_ENV === "production" || process.env.DEPLOY_CHECK === "strict";

const required = [];
const warnings = [];

if (mode === "postgres") {
  required.push("DATABASE_URL");
}
if (queue === "redis") {
  required.push("REDIS_URL");
}
if (process.env.WHATSAPP_MODE === "meta") {
  required.push("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID");
  if (process.env.WHATSAPP_REQUIRE_SIGNATURE !== "false") {
    required.push("WHATSAPP_APP_SECRET");
  }
}
if (process.env.AI_MODE === "xai") {
  required.push("XAI_API_KEY");
}
if (isProdLike) {
  if (process.env.AUTH_ALLOW_HEADERS === "true") {
    warnings.push("AUTH_ALLOW_HEADERS=true is unsafe for public staging/production");
  }
  if (process.env.WHATSAPP_INLINE_DRAIN === "true") {
    warnings.push("WHATSAPP_INLINE_DRAIN=true processes jobs inside webhook; prefer worker/cron");
  }
  if (!process.env.CRON_SECRET && !process.env.WORKER_DRAIN_SECRET) {
    warnings.push("Set CRON_SECRET or WORKER_DRAIN_SECRET for /api/v1/workers/drain");
  }
}

const missing = required.filter((key) => !process.env[key]?.trim());

console.log(
  JSON.stringify(
    {
      ok: missing.length === 0,
      persistence: mode,
      queue,
      missing,
      warnings
    },
    null,
    2
  )
);

process.exit(missing.length === 0 ? 0 : 1);
