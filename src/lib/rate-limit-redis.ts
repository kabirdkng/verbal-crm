import { AppError } from "@/lib/errors";
import { getRedis } from "@/lib/redis";

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export async function assertRedisRateLimit(options: RateLimitOptions): Promise<void> {
  const redis = getRedis();
  if (redis.status !== "ready") {
    await redis.connect().catch(() => undefined);
  }

  const redisKey = `verbal:ratelimit:${options.key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, options.windowMs);
  }
  if (count > options.limit) {
    throw new AppError("FORBIDDEN", 429, "Rate limit exceeded");
  }
}
