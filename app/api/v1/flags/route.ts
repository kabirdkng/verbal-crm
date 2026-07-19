import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAnyRole } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { getStore } from "@/lib/store";
import { setFeatureFlag } from "@/lib/feature-flags";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const context = getAuthContext(request.headers);
    requireAnyRole(context, ["admin", "manager"]);
    const flags = getStore().featureFlags.filter(
      (flag) => flag.organizationId === null || flag.organizationId === context.organizationId
    );
    return NextResponse.json({ data: flags });
  } catch (error) {
    const result = toErrorEnvelope(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const context = getAuthContext(request.headers);
    requireAnyRole(context, ["admin"]);
    const payload = (await request.json()) as {
      key?: string;
      enabled?: boolean;
      organizationScoped?: boolean;
    };
    if (!payload.key || typeof payload.enabled !== "boolean") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "key and enabled required" } },
        { status: 400 }
      );
    }
    setFeatureFlag(
      payload.key,
      payload.enabled,
      payload.organizationScoped ? context.organizationId : null
    );
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const result = toErrorEnvelope(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
