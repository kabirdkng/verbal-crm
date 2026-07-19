import { AppError } from "@/lib/errors";
import { getPersistenceMode } from "@/lib/config";
import { getPrismaAdmin, runAsSystem, runWithTenant } from "@/lib/prisma";
import { getStore } from "@/lib/store";

export type Role = "admin" | "manager" | "agent";
/** Tenant roles plus platform super-admin (not a tenant membership role). */
export type AuthRole = Role | "platform";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: AuthRole;
  sessionId?: string;
  email?: string;
  isPlatformAdmin?: boolean;
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

function isAuthRole(value: string): value is AuthRole {
  return isRole(value) || value === "platform";
}

async function resolveSessionContext(sessionId: string): Promise<AuthContext | null> {
  if (getPersistenceMode() === "postgres") {
    // Sessions are global (not RLS-scoped); use admin client.
    const session = await getPrismaAdmin().session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    if (!isAuthRole(session.role) && !isRole(session.role)) {
      return null;
    }
    const role = (session.role === "platform" ? "platform" : session.role) as AuthRole;
    return {
      userId: session.userId,
      organizationId: session.organizationId,
      role,
      sessionId: session.id,
      email: session.user.email,
      isPlatformAdmin: session.user.isPlatformAdmin || role === "platform"
    };
  }

  const session = getStore().sessions.find((item) => item.id === sessionId);
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  const user = getStore().users.find((item) => item.id === session.userId);
  const role = (session.role === "platform" ? "platform" : session.role) as AuthRole;
  return {
    userId: session.userId,
    organizationId: session.organizationId,
    role,
    sessionId: session.id,
    email: user?.email,
    isPlatformAdmin: user?.isPlatformAdmin || role === "platform"
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

  if (!isRole(role) && role !== "platform") {
    throw new AppError("FORBIDDEN", 403, "Invalid role");
  }

  return {
    userId,
    organizationId,
    role: role as AuthRole,
    isPlatformAdmin: role === "platform"
  };
}

export function requireAnyRole(context: AuthContext, allowedRoles: Role[]): void {
  // Platform admins operating inside a tenant session keep elevated ops where listed.
  if (context.role === "platform") {
    return;
  }
  if (!allowedRoles.includes(context.role as Role)) {
    throw new AppError("FORBIDDEN", 403, "Insufficient role");
  }
}

export function requirePlatformAdmin(context: AuthContext): void {
  if (!context.isPlatformAdmin && context.role !== "platform") {
    throw new AppError("FORBIDDEN", 403, "Platform admin required");
  }
}

/**
 * Resolve auth, then run handler inside tenant RLS/ALS scope when using Postgres.
 */
export async function withTenantAuth<T>(
  headers: HeaderReader,
  fn: (context: AuthContext) => Promise<T>
): Promise<T> {
  const context = await getAuthContext(headers);
  if (getPersistenceMode() === "postgres") {
    return runWithTenant(context.organizationId, () => fn(context));
  }
  return fn(context);
}

/** Identity bootstrap paths that must not run under a tenant GUC. */
export async function withSystemAuth<T>(fn: () => Promise<T>): Promise<T> {
  if (getPersistenceMode() === "postgres") {
    return runAsSystem(fn);
  }
  return fn();
}

export const SESSION_COOKIE = "verbal_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
