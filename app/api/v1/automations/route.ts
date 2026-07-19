import { NextRequest, NextResponse } from "next/server";
import { automationsController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await automationsController.list(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await automationsController.create(request);
  return NextResponse.json(result.body, { status: result.status });
}
