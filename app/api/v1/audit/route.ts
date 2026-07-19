import { NextRequest, NextResponse } from "next/server";
import { auditController } from "@/modules/app/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await auditController.list(request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
