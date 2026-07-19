import { NextRequest, NextResponse } from "next/server";
import { analyticsController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await analyticsController.overview(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
