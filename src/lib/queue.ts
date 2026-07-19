import { getStore, type QueueJobRecord } from "@/lib/store";

export type EnqueueInput = {
  type: string;
  payload: Record<string, unknown>;
};

export type JobHandler = (job: QueueJobRecord) => Promise<void>;

export interface JobQueue {
  enqueue(input: EnqueueInput): Promise<QueueJobRecord>;
  processNext(handler: JobHandler): Promise<QueueJobRecord | null>;
  processAll(handler: JobHandler, maxJobs?: number): Promise<number>;
  listPending(): Promise<QueueJobRecord[]>;
}

export class InMemoryJobQueue implements JobQueue {
  async enqueue(input: EnqueueInput): Promise<QueueJobRecord> {
    const now = new Date();
    const job: QueueJobRecord = {
      id: `job_${crypto.randomUUID()}`,
      type: input.type,
      payload: input.payload,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now
    };
    getStore().jobs.push(job);
    return job;
  }

  async processNext(handler: JobHandler): Promise<QueueJobRecord | null> {
    const job = getStore().jobs.find((item) => item.status === "pending");
    if (!job) {
      return null;
    }

    job.status = "processing";
    job.attempts += 1;
    job.updatedAt = new Date();

    try {
      await handler(job);
      job.status = "completed";
      job.updatedAt = new Date();
    } catch (error) {
      job.status = "failed";
      job.lastError = error instanceof Error ? error.message : "Unknown job failure";
      job.updatedAt = new Date();
    }

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
    return getStore().jobs.filter((item) => item.status === "pending");
  }
}
