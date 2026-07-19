import { NextRequest, NextResponse } from "next/server";
import { callingController } from "@/modules/app/container";

/**
 * Mock/local: simulate a customer dialing the tenant's Vapi number (inbound AI call).
 * POST { "from": "+15551234567" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await callingController.simulateInboundVapi(request);
  return NextResponse.json(result.body, { status: result.status });
}
