export type SessionContext = {
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "agent";
  email?: string;
  name?: string;
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
  session: SessionContext | null,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  // Cookie session preferred; headers retained for demo/tools when AUTH_ALLOW_HEADERS is on.
  if (session) {
    headers.set("x-user-id", session.userId);
    headers.set("x-organization-id", session.organizationId);
    headers.set("x-role", session.role);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include"
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    const message = body.error?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export const defaultSession: SessionContext = {
  userId: "u_demo_admin",
  organizationId: "org_demo",
  role: "admin",
  email: "admin@demo.local",
  name: "Demo Admin"
};
