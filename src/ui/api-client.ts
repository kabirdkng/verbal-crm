export type SessionContext = {
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "agent" | "platform";
  email?: string;
  name?: string;
  organizationName?: string;
  isPlatformAdmin?: boolean;
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

  // Cookie session is authoritative (credentials: "include").
  // Header auth is a local/dev fallback when AUTH_ALLOW_HEADERS is enabled.
  if (session?.userId && session.organizationId) {
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

export const emptySession: SessionContext = {
  userId: "",
  organizationId: "",
  role: "agent"
};
