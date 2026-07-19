import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    data: {
      status: "ok",
      service: "verbal-crm",
      version: "0.1.0",
      phase: 1
    }
  });
}
