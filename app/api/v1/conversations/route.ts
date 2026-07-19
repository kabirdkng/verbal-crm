import { NextRequest, NextResponse } from "next/server";
import { conversationsController } from "@/modules/app/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await conversationsController.post(request);
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await conversationsController.get(
    request.headers,
    request.nextUrl.searchParams
  );
  return NextResponse.json(result.body, { status: result.status });
}
