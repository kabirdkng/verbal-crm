import { NextRequest, NextResponse } from "next/server";
import { identityController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await identityController.members(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
