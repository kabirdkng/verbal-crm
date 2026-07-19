import { NextRequest, NextResponse } from "next/server";
import { identityController } from "@/modules/app/container";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const result = await identityController.updateSettings(request);
  return NextResponse.json(result.body, { status: result.status });
}
