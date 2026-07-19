import { NextRequest, NextResponse } from "next/server";
import { identityController } from "@/modules/app/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await identityController.register(request);
  const response = NextResponse.json(result.body, { status: result.status });
  if (result.headers?.["set-cookie"]) {
    response.headers.set("set-cookie", result.headers["set-cookie"]);
  }
  return response;
}
