import { NextRequest, NextResponse } from "next/server";
import { appContainer } from "@/modules/app/container";
import { processBatch } from "@/workers/whatsapp-worker";

/**
 * Secret-protected queue drain for external cron / serverless schedules.
 * Prefer the long-running `npm run worker` process for Docker/production.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Accept WORKER_DRAIN_SECRET or Vercel Cron's CRON_SECRET (Bearer).
  const secrets = [
    process.env.WORKER_DRAIN_SECRET,
    process.env.CRON_SECRET,
    process.env.NODE_ENV === "production" ? undefined : "dev-worker-secret"
  ].filter((value): value is string => Boolean(value && value.length > 0));

  const provided =
    request.headers.get("x-worker-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!provided || !secrets.includes(provided)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid worker secret" } },
      { status: 403 }
    );
  }

  const result = await processBatch({
    queue: appContainer.queue,
    handler: (job) => appContainer.inboundWorker.handle(job),
    batchSize: Number(process.env.WORKER_BATCH_SIZE ?? "50")
  });

  return NextResponse.json({
    data: {
      ...result,
      queueMode: appContainer.queueMode,
      persistence: appContainer.persistence
    }
  });
}
