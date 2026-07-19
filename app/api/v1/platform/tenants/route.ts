import { NextRequest, NextResponse } from "next/server";
import { identityController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await identityController.listTenants(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await identityController.createTenant(request);
  return NextResponse.json(result.body, { status: result.status });
}
