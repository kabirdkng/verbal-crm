import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole, withTenantAuth } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { getStore } from "@/lib/store";
import { setFeatureFlag } from "@/lib/feature-flags";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await withTenantAuth(request.headers, async (context) => {
      requireAnyRole(context, ["admin", "manager"]);
      const flags = getStore().featureFlags.filter(
        (flag) => flag.organizationId === null || flag.organizationId === context.organizationId
      );
      return { data: flags };
    });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = toErrorEnvelope(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await withTenantAuth(request.headers, async (context) => {
      requireAnyRole(context, ["admin"]);
      const payload = (await request.json()) as {
        key?: string;
        enabled?: boolean;
        organizationScoped?: boolean;
      };
      if (!payload.key || typeof payload.enabled !== "boolean") {
        return {
          error: true as const,
          status: 400,
          body: { error: { code: "VALIDATION_ERROR", message: "key and enabled required" } }
        };
      }
      setFeatureFlag(
        payload.key,
        payload.enabled,
        payload.organizationScoped ? context.organizationId : null
      );
      return { error: false as const, data: { ok: true } };
    });

    if ("error" in result && result.error) {
      return NextResponse.json(result.body, { status: result.status });
    }
    return NextResponse.json({ data: (result as { data: unknown }).data });
  } catch (error) {
    const mapped = toErrorEnvelope(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
