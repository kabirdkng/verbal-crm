import { NextRequest, NextResponse } from "next/server";
import { aiController } from "@/modules/app/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await aiController.suggest(request);
  return NextResponse.json(result.body, { status: result.status });
}
