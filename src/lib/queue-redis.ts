import { createId } from "@/lib/ids";
import { getRedis } from "@/lib/redis";
import type { EnqueueInput, JobHandler, JobQueue } from "@/lib/queue";
import type { QueueJobRecord } from "@/lib/store";

const QUEUE_KEY = "verbal:jobs:pending";
const JOB_KEY_PREFIX = "verbal:job:";

/**
 * Redis list-backed job queue for Docker local / multi-instance workers.
 */
export class RedisJobQueue implements JobQueue {
  async enqueue(input: EnqueueInput): Promise<QueueJobRecord> {
    const redis = getRedis();
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }

    const now = new Date();
    const job: QueueJobRecord = {
      id: createId("job"),
      type: input.type,
      payload: input.payload,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now
    };

    await redis.set(JOB_KEY_PREFIX + job.id, JSON.stringify(job));
    await redis.rpush(QUEUE_KEY, job.id);
    return job;
  }

  async processNext(handler: JobHandler): Promise<QueueJobRecord | null> {
    const redis = getRedis();
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }

    // Prefer blocking pop when WORKER_BLOCKING_POP_SECONDS > 0 (long-running worker).
    const blockSeconds = Number(process.env.WORKER_BLOCKING_POP_SECONDS ?? "0");
    let jobId: string | null = null;
    if (blockSeconds > 0) {
      const blocked = await redis.blpop(QUEUE_KEY, blockSeconds);
      jobId = blocked?.[1] ?? null;
    } else {
      jobId = await redis.lpop(QUEUE_KEY);
    }
    if (!jobId) {
      return null;
    }

    const raw = await redis.get(JOB_KEY_PREFIX + jobId);
    if (!raw) {
      return null;
    }

    const job = JSON.parse(raw) as QueueJobRecord;
    job.status = "processing";
    job.attempts += 1;
    job.updatedAt = new Date();
    // revive dates
    job.createdAt = new Date(job.createdAt);
    await redis.set(JOB_KEY_PREFIX + job.id, JSON.stringify(job));

    try {
      await handler(job);
      job.status = "completed";
      job.updatedAt = new Date();
    } catch (error) {
      job.status = "failed";
      job.lastError = error instanceof Error ? error.message : "Unknown job failure";
      job.updatedAt = new Date();
    }

    await redis.set(JOB_KEY_PREFIX + job.id, JSON.stringify(job));
    return job;
  }

  async processAll(handler: JobHandler, maxJobs = 100): Promise<number> {
    let processed = 0;
    while (processed < maxJobs) {
      const job = await this.processNext(handler);
      if (!job) {
        break;
      }
      processed += 1;
    }
    return processed;
  }

  async listPending(): Promise<QueueJobRecord[]> {
    const redis = getRedis();
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    const ids = await redis.lrange(QUEUE_KEY, 0, -1);
    const jobs: QueueJobRecord[] = [];
    for (const id of ids) {
      const raw = await redis.get(JOB_KEY_PREFIX + id);
      if (raw) {
        const job = JSON.parse(raw) as QueueJobRecord;
        job.createdAt = new Date(job.createdAt);
        job.updatedAt = new Date(job.updatedAt);
        jobs.push(job);
      }
    }
    return jobs;
  }
}
