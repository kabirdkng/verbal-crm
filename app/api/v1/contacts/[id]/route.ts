import { NextRequest, NextResponse } from "next/server";
import { contactsController } from "@/modules/app/container";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await contactsController.getById(request.headers, id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await contactsController.patch(request, id);
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const result = await contactsController.delete(request.headers, id);
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(result.body, { status: result.status });
}
