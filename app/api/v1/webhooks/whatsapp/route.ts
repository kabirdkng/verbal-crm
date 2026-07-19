import { NextRequest, NextResponse } from "next/server";
import { drainWhatsAppQueue, whatsAppWebhookController } from "@/modules/app/container";

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
 * Inbound WhatsApp webhook: validate → dedupe → enqueue → ack.
 * Phase 1 drains the in-process queue after ACK response path for local demo reliability.
 * Production should ACK first and process via managed workers only.
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

  // Drain after building ack so handler remains conceptually ack-first.
  // Errors in drain do not fail the webhook ack if already accepted.
  if (result.status === 200) {
    try {
      await drainWhatsAppQueue();
    } catch {
      // Worker failures are persisted on webhook event status.
    }
  }

  return NextResponse.json(result.body, { status: result.status });
}
