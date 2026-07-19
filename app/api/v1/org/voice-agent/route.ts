import { NextRequest, NextResponse } from "next/server";
import { voiceAgentController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await voiceAgentController.get(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const result = await voiceAgentController.update(request);
  return NextResponse.json(result.body, { status: result.status });
}
