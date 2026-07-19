import { NextRequest, NextResponse } from "next/server";
import { templatesController } from "@/modules/app/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await templatesController.post(request);
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await templatesController.get(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
