export type SessionContext = {
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "agent";
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export async function apiFetch<T>(
  path: string,
  session: SessionContext,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-user-id", session.userId);
  headers.set("x-organization-id", session.organizationId);
  headers.set("x-role", session.role);

  const response = await fetch(path, {
    ...init,
    headers
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    const message = body.error?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export const defaultSession: SessionContext = {
  userId: "u_demo_agent",
  organizationId: "org_demo",
  role: "admin"
};
