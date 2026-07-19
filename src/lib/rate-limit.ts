import { AppError } from "@/lib/errors";
import { getStore } from "@/lib/store";

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export function assertRateLimit(options: RateLimitOptions): void {
  const now = Date.now();
  const store = getStore();
  let bucket = store.rateLimitBuckets.find((item) => item.key === options.key);

  if (!bucket || now - bucket.windowStart >= options.windowMs) {
    bucket = { key: options.key, count: 0, windowStart: now };
    store.rateLimitBuckets = store.rateLimitBuckets.filter((item) => item.key !== options.key);
    store.rateLimitBuckets.push(bucket);
  }

  bucket.count += 1;
  if (bucket.count > options.limit) {
    throw new AppError("FORBIDDEN", 429, "Rate limit exceeded");
  }
}
