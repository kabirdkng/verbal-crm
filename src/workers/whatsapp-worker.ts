import { disconnectPrisma } from "@/lib/prisma";
import { disconnectRedis } from "@/lib/redis";
import type { JobQueue } from "@/lib/queue";
import type { QueueJobRecord } from "@/lib/store";
import { appContainer, whatsAppConfig } from "@/modules/app/container";

export type WorkerOptions = {
  /** Max jobs per batch when draining. */
  batchSize?: number;
  /** Idle sleep between empty polls (ms). */
  pollIntervalMs?: number;
  /** Exit after one batch (for cron). */
  once?: boolean;
  /** Optional override queue (tests). */
  queue?: JobQueue;
  /** Optional job handler (tests). */
  handler?: (job: QueueJobRecord) => Promise<void>;
};

export type WorkerBatchResult = {
  processed: number;
  completed: number;
  failed: number;
  at: string;
};

function log(message: string, meta?: Record<string, unknown>): void {
  const line = {
    service: "verbal-crm-worker",
    message,
    ...meta,
    ts: new Date().toISOString()
  };
  console.log(JSON.stringify(line));
}

export async function processBatch(options: WorkerOptions = {}): Promise<WorkerBatchResult> {
  const batchSize = options.batchSize ?? Number(process.env.WORKER_BATCH_SIZE ?? "50");
  const queue = options.queue ?? appContainer.queue;
  const handler =
    options.handler ?? ((job: QueueJobRecord) => appContainer.inboundWorker.handle(job));

  let processed = 0;
  let completed = 0;
  let failed = 0;

  while (processed < batchSize) {
    const job = await queue.processNext(handler);
    if (!job) {
      break;
    }
    processed += 1;
    if (job.status === "completed") {
      completed += 1;
    } else if (job.status === "failed") {
      failed += 1;
    }
  }

  return {
    processed,
    completed,
    failed,
    at: new Date().toISOString()
  };
}

/**
 * Long-running worker loop with graceful SIGINT/SIGTERM shutdown.
 */
export async function runWhatsAppWorkerLoop(options: WorkerOptions = {}): Promise<void> {
  const pollIntervalMs =
    options.pollIntervalMs ?? Number(process.env.WORKER_POLL_INTERVAL_MS ?? "1000");
  const once = options.once ?? process.env.WORKER_ONCE === "true";

  log("worker_starting", {
    persistence: appContainer.persistence,
    queueMode: appContainer.queueMode,
    whatsAppMode: whatsAppConfig.mode,
    inlineDrain: whatsAppConfig.inlineDrain,
    once,
    pollIntervalMs
  });

  let stopping = false;
  const onSignal = (signal: string) => {
    log("worker_signal", { signal });
    stopping = true;
  };
  process.on("SIGINT", () => onSignal("SIGINT"));
  process.on("SIGTERM", () => onSignal("SIGTERM"));

  try {
    while (!stopping) {
      const result = await processBatch(options);
      if (result.processed > 0) {
        log("worker_batch", result as unknown as Record<string, unknown>);
      }

      if (once) {
        break;
      }

      if (result.processed === 0) {
        await sleep(pollIntervalMs);
      }
    }
  } finally {
    log("worker_stopping");
    await disconnectRedis().catch(() => undefined);
    await disconnectPrisma().catch(() => undefined);
    process.off("SIGINT", () => onSignal("SIGINT"));
    process.off("SIGTERM", () => onSignal("SIGTERM"));
  }

  log("worker_stopped");
}

/** Cron/one-shot entry: drain up to batch size and exit. */
export async function runWhatsAppWorkerOnce(options: WorkerOptions = {}): Promise<WorkerBatchResult> {
  try {
    return await processBatch({ ...options, once: true });
  } finally {
    await disconnectRedis().catch(() => undefined);
    await disconnectPrisma().catch(() => undefined);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
