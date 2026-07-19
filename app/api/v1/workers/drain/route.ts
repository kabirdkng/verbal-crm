import { NextRequest, NextResponse } from "next/server";
import { drainWhatsAppQueue } from "@/modules/app/container";

/**
 * Secret-protected queue drain for multi-instance / cron workers (Phase 5).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.WORKER_DRAIN_SECRET ?? "dev-worker-secret";
  const provided =
    request.headers.get("x-worker-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== expected) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid worker secret" } },
      { status: 403 }
    );
  }

  const processed = await drainWhatsAppQueue();
  return NextResponse.json({ data: { processed } });
}
