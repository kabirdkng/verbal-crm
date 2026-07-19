import { NextRequest, NextResponse } from "next/server";
import { callingService } from "@/modules/app/container";
import { loadVapiConfig } from "@/modules/voice-agent/config";

/**
 * Vapi server URL webhook (inbound + outbound).
 *
 * Configure on the Vapi phone number (recommended for multi-tenant inbound):
 *   Server URL → https://your-host/api/v1/webhooks/vapi
 *
 * Events:
 * - assistant-request → we return a transient assistant from the tenant's voice context
 * - status-update / end-of-call-report → CRM call lifecycle + summary
 *
 * Optional: VAPI_WEBHOOK_SECRET matched against x-vapi-secret header.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = loadVapiConfig();
  if (config.webhookSecret) {
    const header =
      request.headers.get("x-vapi-secret") ?? request.headers.get("x-vapi-signature");
    if (header !== config.webhookSecret) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Invalid Vapi webhook secret" } },
        { status: 403 }
      );
    }
  }

  const payload = await request.json().catch(() => ({}));
  const result = await callingService.handleVapiWebhook(payload);

  // assistant-request must return the assistant payload as the top-level JSON body.
  if (result.kind === "assistant-request") {
    return NextResponse.json(result.vapiResponse, { status: 200 });
  }

  return NextResponse.json({ data: result }, { status: 200 });
}
