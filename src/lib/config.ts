export type PersistenceMode = "memory" | "postgres";
export type QueueMode = "memory" | "redis";

export function getPersistenceMode(): PersistenceMode {
  const mode = process.env.PERSISTENCE_MODE ?? "memory";
  if (mode === "postgres" || mode === "prisma") {
    return "postgres";
  }
  return "memory";
}

export function getQueueMode(): QueueMode {
  return process.env.QUEUE_MODE === "redis" ? "redis" : "memory";
}

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required when PERSISTENCE_MODE=postgres");
  }
  return url;
}
