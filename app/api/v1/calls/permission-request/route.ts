import { NextRequest, NextResponse } from "next/server";
import { callingController } from "@/modules/app/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await callingController.requestPermission(request);
  return NextResponse.json(result.body, { status: result.status });
}
