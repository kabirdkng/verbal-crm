import { AppError } from "@/lib/errors";

export type Role = "admin" | "manager" | "agent";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: Role;
};

export type HeaderReader = {
  get(name: string): string | null;
};

export function getAuthContext(headers: HeaderReader): AuthContext {
  const userId = headers.get("x-user-id");
  const organizationId = headers.get("x-organization-id");
  const role = headers.get("x-role");

  if (!userId || !organizationId || !role) {
    throw new AppError("UNAUTHORIZED", 401, "Missing authentication headers");
  }

  if (role !== "admin" && role !== "manager" && role !== "agent") {
    throw new AppError("FORBIDDEN", 403, "Invalid role");
  }

  return { userId, organizationId, role };
}

export function requireAnyRole(context: AuthContext, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw new AppError("FORBIDDEN", 403, "Insufficient role");
  }
}
