import { NextRequest, NextResponse } from "next/server";
import {
  drainWhatsAppQueue,
  whatsAppConfig,
  whatsAppWebhookController
} from "@/modules/app/container";

/**
 * Meta webhook verification (subscribe challenge).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = whatsAppWebhookController.verify(request.nextUrl.searchParams);
  if (typeof result.body === "string") {
    return new NextResponse(result.body, {
      status: result.status,
      headers: { "content-type": "text/plain" }
    });
  }
  return NextResponse.json(result.body, { status: result.status });
}

/**
 * Inbound WhatsApp webhook: validate signature → dedupe → enqueue → ack.
 *
 * Production (WHATSAPP_INLINE_DRAIN=false): ack only; workers drain the queue.
 * Local demo default: optional inline drain after accept for convenience.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const result = await whatsAppWebhookController.post(
    rawBody,
    payload,
    request.headers.get("x-hub-signature-256"),
    request.headers.get("x-organization-id")
  );

  if (result.status === 200 && whatsAppConfig.inlineDrain) {
    try {
      await drainWhatsAppQueue();
    } catch {
      // Worker failures are persisted on webhook event status.
    }
  }

  return NextResponse.json(result.body, { status: result.status });
}
