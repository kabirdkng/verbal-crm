import { NextRequest, NextResponse } from "next/server";
import { aiController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await aiController.budget(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
