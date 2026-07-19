import { NextResponse } from "next/server";
import { getPersistenceMode, getQueueMode } from "@/lib/config";
import { getPrisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export async function GET(): Promise<NextResponse> {
  const persistence = getPersistenceMode();
  const queueMode = getQueueMode();

  let postgres: "up" | "down" | "skipped" = "skipped";
  let redis: "up" | "down" | "skipped" = "skipped";

  if (persistence === "postgres") {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      postgres = "up";
    } catch {
      postgres = "down";
    }
  }

  if (queueMode === "redis") {
    try {
      const client = getRedis();
      if (client.status !== "ready") {
        await client.connect();
      }
      const pong = await client.ping();
      redis = pong === "PONG" ? "up" : "down";
    } catch {
      redis = "down";
    }
  }

  const healthy =
    (postgres === "up" || postgres === "skipped") &&
    (redis === "up" || redis === "skipped");

  return NextResponse.json(
    {
      data: {
        status: healthy ? "ok" : "degraded",
        service: "verbal-crm",
        version: "1.1.0",
        persistence,
        queueMode,
        dependencies: {
          postgres,
          redis
        }
      }
    },
    { status: healthy ? 200 : 503 }
  );
}
