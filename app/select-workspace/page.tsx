"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Workspace = {
  organizationId: string;
  name: string;
  role: string;
};

export default function SelectWorkspacePage() {
  const { session, refreshMe, authenticated, isPlatformAdmin, isPlatformHome } = useSession();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    if (isPlatformHome || (isPlatformAdmin && session.role === "platform")) {
      router.replace("/admin");
      return;
    }
    void apiFetch<{ data: Workspace[] }>("/api/v1/org/organizations", session)
      .then((res) => {
        setWorkspaces(res.data);
        if (res.data.length === 1) {
          void choose(res.data[0]!.organizationId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load workspaces"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, session.userId, isPlatformAdmin, isPlatformHome]);

  async function choose(organizationId: string) {
    setError(null);
    try {
      const path = isPlatformAdmin
        ? "/api/v1/platform/tenants/enter"
        : "/api/v1/auth/switch-org";
      await apiFetch(path, session, {
        method: "POST",
        body: JSON.stringify({ organizationId })
      });
      await refreshMe();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open workspace");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "3rem auto" }}>
      <header className="page-header">
        <div>
          <h1>Select workspace</h1>
          <p>Choose which organization to open.</p>
        </div>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      <section className="card stack">
        {workspaces.length === 0 ? (
          <div className="empty">No workspaces found for this account.</div>
        ) : (
          workspaces.map((ws) => (
            <button
              key={ws.organizationId}
              className="btn"
              type="button"
              style={{ justifyContent: "space-between", display: "flex" }}
              onClick={() => void choose(ws.organizationId)}
            >
              <span>{ws.name}</span>
              <span className="muted">{ws.role}</span>
            </button>
          ))
        )}
      </section>
    </div>
  );
}
