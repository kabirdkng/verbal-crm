import { NextRequest, NextResponse } from "next/server";
import { callingService } from "@/modules/app/container";
import { loadVapiConfig } from "@/modules/voice-agent/config";

/**
 * Vapi server URL webhook.
 * Configure in Vapi dashboard → Assistants / Phone Numbers → Server URL
 * → https://your-host/api/v1/webhooks/vapi
 *
 * Optional: VAPI_WEBHOOK_SECRET matched against x-vapi-secret header.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = loadVapiConfig();
  if (config.webhookSecret) {
    const header = request.headers.get("x-vapi-secret");
    if (header !== config.webhookSecret) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Invalid Vapi webhook secret" } },
        { status: 403 }
      );
    }
  }

  const payload = await request.json().catch(() => ({}));
  const result = await callingService.handleVapiWebhook(payload);
  return NextResponse.json({ data: result }, { status: 200 });
}
