import { NextRequest, NextResponse } from "next/server";
import { messagesController } from "@/modules/app/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await messagesController.list(request.headers, id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await messagesController.send(request, id);
  return NextResponse.json(result.body, { status: result.status });
}
