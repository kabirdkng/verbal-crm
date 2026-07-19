import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryJobQueue } from "@/lib/queue";
import { resetStore } from "@/lib/store";
import { processBatch } from "@/workers/whatsapp-worker";

describe("whatsapp worker processBatch", () => {
  beforeEach(() => {
    resetStore();
  });

  it("processes pending jobs with the provided handler", async () => {
    const queue = new InMemoryJobQueue();
    await queue.enqueue({ type: "whatsapp.inbound_message", payload: { n: 1 } });
    await queue.enqueue({ type: "whatsapp.inbound_message", payload: { n: 2 } });

    const seen: number[] = [];
    const result = await processBatch({
      queue,
      batchSize: 10,
      async handler(job) {
        seen.push(Number(job.payload.n));
      }
    });

    expect(result.processed).toBe(2);
    expect(result.completed).toBe(2);
    expect(result.failed).toBe(0);
    expect(seen).toEqual([1, 2]);
  });

  it("counts failed jobs without stopping the batch", async () => {
    const queue = new InMemoryJobQueue();
    await queue.enqueue({ type: "t", payload: { n: 1 } });
    await queue.enqueue({ type: "t", payload: { n: 2 } });

    const result = await processBatch({
      queue,
      batchSize: 10,
      async handler(job) {
        if (job.payload.n === 1) {
          throw new Error("boom");
        }
      }
    });

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.completed).toBe(1);
  });

  it("respects batch size", async () => {
    const queue = new InMemoryJobQueue();
    await queue.enqueue({ type: "t", payload: {} });
    await queue.enqueue({ type: "t", payload: {} });
    await queue.enqueue({ type: "t", payload: {} });

    const result = await processBatch({
      queue,
      batchSize: 2,
      async handler() {
        /* ok */
      }
    });

    expect(result.processed).toBe(2);
    const pending = await queue.listPending();
    expect(pending).toHaveLength(1);
  });
});
