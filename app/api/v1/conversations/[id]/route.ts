import { NextRequest, NextResponse } from "next/server";
import { conversationsController } from "@/modules/app/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await conversationsController.getById(request.headers, id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await conversationsController.patch(request, id);
  return NextResponse.json(result.body, { status: result.status });
}
