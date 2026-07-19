import { NextRequest, NextResponse } from "next/server";
import { callingController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await callingController.list(
    request.headers,
    request.nextUrl.searchParams
  );
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await callingController.initiate(request);
  return NextResponse.json(result.body, { status: result.status });
}
