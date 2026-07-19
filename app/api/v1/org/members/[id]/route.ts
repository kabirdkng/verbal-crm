import { NextRequest, NextResponse } from "next/server";
import { identityController } from "@/modules/app/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await identityController.updateMember(request, id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await identityController.removeMember(request.headers, id);
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(result.body, { status: result.status });
}
