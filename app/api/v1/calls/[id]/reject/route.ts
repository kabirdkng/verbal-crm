import { NextRequest, NextResponse } from "next/server";
import { callingController } from "@/modules/app/container";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const result = await callingController.reject(request.headers, id);
  return NextResponse.json(result.body, { status: result.status });
}
