/**
 * WhatsApp queue worker entrypoint.
 *
 * Continuous:
 *   npm run worker
 *
 * One-shot (cron):
 *   npm run worker:once
 *
 * Env:
 *   WORKER_ONCE=true
 *   WORKER_BATCH_SIZE=50
 *   WORKER_POLL_INTERVAL_MS=1000
 *   QUEUE_MODE=redis
 *   PERSISTENCE_MODE=postgres
 */
import { runWhatsAppWorkerLoop, runWhatsAppWorkerOnce } from "../src/workers/whatsapp-worker";

async function main() {
  const once = process.argv.includes("--once") || process.env.WORKER_ONCE === "true";
  if (once) {
    const result = await runWhatsAppWorkerOnce();
    console.log(JSON.stringify({ service: "verbal-crm-worker", event: "once", ...result }));
    process.exit(0);
  }

  await runWhatsAppWorkerLoop();
  process.exit(0);
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      service: "verbal-crm-worker",
      level: "error",
      message: error instanceof Error ? error.message : String(error),
      ts: new Date().toISOString()
    })
  );
  process.exit(1);
});
