import { AppError } from "@/lib/errors";
import { getPersistenceMode } from "@/lib/config";
import { getPrisma } from "@/lib/prisma";
import { getStore } from "@/lib/store";

export type Role = "admin" | "manager" | "agent";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: Role;
  sessionId?: string;
  email?: string;
};

export type HeaderReader = {
  get(name: string): string | null;
};

function parseCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }
  const parts = header.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function allowHeaderAuth(): boolean {
  if (process.env.AUTH_ALLOW_HEADERS === "false") {
    return false;
  }
  if (process.env.NODE_ENV === "production" && process.env.AUTH_ALLOW_HEADERS !== "true") {
    return false;
  }
  return true;
}

function isRole(value: string): value is Role {
  return value === "admin" || value === "manager" || value === "agent";
}

async function resolveSessionContext(sessionId: string): Promise<AuthContext | null> {
  if (getPersistenceMode() === "postgres") {
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    if (!isRole(session.role)) {
      return null;
    }
    return {
      userId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      sessionId: session.id,
      email: session.user.email
    };
  }

  const session = getStore().sessions.find((item) => item.id === sessionId);
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  const user = getStore().users.find((item) => item.id === session.userId);
  return {
    userId: session.userId,
    organizationId: session.organizationId,
    role: session.role,
    sessionId: session.id,
    email: user?.email
  };
}

export async function getAuthContext(headers: HeaderReader): Promise<AuthContext> {
  const sessionId = parseCookie(headers.get("cookie"), "verbal_session");
  if (sessionId) {
    const fromSession = await resolveSessionContext(sessionId);
    if (fromSession) {
      return fromSession;
    }
  }

  if (!allowHeaderAuth()) {
    throw new AppError("UNAUTHORIZED", 401, "Authentication required");
  }

  const userId = headers.get("x-user-id");
  const organizationId = headers.get("x-organization-id");
  const role = headers.get("x-role");

  if (!userId || !organizationId || !role) {
    throw new AppError("UNAUTHORIZED", 401, "Missing authentication headers");
  }

  if (!isRole(role)) {
    throw new AppError("FORBIDDEN", 403, "Invalid role");
  }

  return { userId, organizationId, role };
}

export function requireAnyRole(context: AuthContext, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw new AppError("FORBIDDEN", 403, "Insufficient role");
  }
}

export const SESSION_COOKIE = "verbal_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
