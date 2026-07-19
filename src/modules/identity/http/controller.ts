import { getAuthContext, SESSION_COOKIE, type HeaderReader } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { MeResponseSchema } from "@/modules/identity/contracts";
import { IdentityService } from "@/modules/identity/service";

export type JsonRequest = {
  headers: HeaderReader;
  json(): Promise<unknown>;
};

export type JsonResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

function sessionCookie(sessionId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  async register(request: JsonRequest): Promise<JsonResponse> {
    try {
      const payload = await request.json();
      const result = await this.service.register(payload);
      return {
        status: 201,
        body: {
          data: {
            userId: result.userId,
            organizationId: result.organizationId,
            role: result.role
          }
        },
        headers: { "set-cookie": sessionCookie(result.sessionId) }
      };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async login(request: JsonRequest): Promise<JsonResponse> {
    try {
      const payload = await request.json();
      const result = await this.service.login(payload);
      return {
        status: 200,
        body: {
          data: {
            userId: result.userId,
            organizationId: result.organizationId,
            role: result.role
          }
        },
        headers: { "set-cookie": sessionCookie(result.sessionId) }
      };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async logout(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      await this.service.logout(context.sessionId);
      return {
        status: 200,
        body: { data: { ok: true } },
        headers: { "set-cookie": clearSessionCookie() }
      };
    } catch {
      return {
        status: 200,
        body: { data: { ok: true } },
        headers: { "set-cookie": clearSessionCookie() }
      };
    }
  }

  async me(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      const me = await this.service.me(context);
      const body = MeResponseSchema.parse({ data: me });
      return { status: 200, body };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async switchOrg(request: JsonRequest): Promise<JsonResponse> {
    try {
      const context = getAuthContext(request.headers);
      const payload = await request.json();
      const result = await this.service.switchOrganization(context, payload);
      return {
        status: 200,
        body: {
          data: {
            organizationId: result.organizationId,
            role: result.role
          }
        },
        headers: { "set-cookie": sessionCookie(result.sessionId) }
      };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async updateSettings(request: JsonRequest): Promise<JsonResponse> {
    try {
      const context = getAuthContext(request.headers);
      const payload = await request.json();
      const org = await this.service.updateSettings(context, payload);
      return {
        status: 200,
        body: {
          data: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            aiBudgetUsd: org.aiBudgetUsd
          }
        }
      };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }

  async members(headers: HeaderReader): Promise<JsonResponse> {
    try {
      const context = getAuthContext(headers);
      const members = await this.service.listMembers(context);
      return {
        status: 200,
        body: {
          data: members.map((member) => ({
            id: member.id,
            userId: member.userId,
            email: member.email,
            name: member.name,
            role: member.role
          }))
        }
      };
    } catch (error) {
      return toErrorEnvelope(error);
    }
  }
}
