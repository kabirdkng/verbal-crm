import Redis from "ioredis";

const globalForRedis = globalThis as typeof globalThis & {
  __verbalRedis?: Redis;
};

export function getRedis(): Redis {
  if (!globalForRedis.__verbalRedis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    globalForRedis.__verbalRedis = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true
    });
  }
  return globalForRedis.__verbalRedis;
}

export async function disconnectRedis(): Promise<void> {
  if (globalForRedis.__verbalRedis) {
    await globalForRedis.__verbalRedis.quit().catch(() => undefined);
    globalForRedis.__verbalRedis = undefined;
  }
}

export function isRedisQueueMode(): boolean {
  return process.env.QUEUE_MODE === "redis";
}
