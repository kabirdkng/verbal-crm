"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Overview = {
  contacts: number;
  conversations: number;
  openConversations: number;
  messages: { total: number; inbound: number; outbound: number };
  ai: { calls: number; estimatedCostUsd: number };
};

export default function HomePage() {
  const { session, authenticated, isPlatformHome, isPlatformAdmin, isTenantWorkspace } =
    useSession();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatformHome) {
      router.replace("/admin");
    }
  }, [isPlatformHome, router]);

  useEffect(() => {
    if (!isTenantWorkspace) return;
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const result = await apiFetch<{ data: Overview }>("/api/v1/analytics/overview", session);
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load overview");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session, isTenantWorkspace]);

  if (isPlatformHome) {
    return <div className="empty">Redirecting to platform admin…</div>;
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{session.organizationName ?? "Workspace"} overview</h1>
          <p>
            Tenant workspace for contacts, WhatsApp inbox, automations, and AI assist.
            {isPlatformAdmin ? " You are viewing this tenant as platform admin." : ""}
          </p>
        </div>
        <div className="row">
          <Link className="btn btn-primary" href="/inbox">
            Open inbox
          </Link>
          {!authenticated ? (
            <Link className="btn" href="/login">
              Sign in
            </Link>
          ) : null}
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stats" style={{ marginBottom: "1rem" }}>
        <div className="stat">
          <span className="muted">Contacts</span>
          <strong>{data?.contacts ?? "—"}</strong>
        </div>
        <div className="stat">
          <span className="muted">Open conversations</span>
          <strong>{data?.openConversations ?? "—"}</strong>
        </div>
        <div className="stat">
          <span className="muted">Messages</span>
          <strong>{data?.messages.total ?? "—"}</strong>
        </div>
        <div className="stat">
          <span className="muted">AI cost</span>
          <strong>{data ? `$${data.ai.estimatedCostUsd.toFixed(4)}` : "—"}</strong>
        </div>
      </div>

      <div className="grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Quick links</h2>
          <div className="row">
            <Link className="btn" href="/contacts">
              Contacts
            </Link>
            <Link className="btn" href="/team">
              Team
            </Link>
            <Link className="btn" href="/settings">
              Settings
            </Link>
            {isPlatformAdmin ? (
              <Link className="btn" href="/admin">
                Platform admin
              </Link>
            ) : null}
          </div>
        </section>
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Roles</h2>
          <ul className="muted">
            <li>
              <strong>Platform admin</strong> — manage tenants, enter any workspace
            </li>
            <li>
              <strong>Tenant admin / manager / agent</strong> — CRM inside one org
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
