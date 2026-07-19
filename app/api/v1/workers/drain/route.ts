import { NextRequest, NextResponse } from "next/server";
import { appContainer } from "@/modules/app/container";
import { processBatch } from "@/workers/whatsapp-worker";

/**
 * Secret-protected queue drain for external cron / serverless schedules.
 * Prefer the long-running `npm run worker` process for Docker/production.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.WORKER_DRAIN_SECRET ?? "dev-worker-secret";
  const provided =
    request.headers.get("x-worker-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== expected) {
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
