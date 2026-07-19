"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const { session, authenticated } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [session]);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Overview</h1>
          <p>
            Full platform (Phases 1–5): identity, CRM ops, broadcasts, automations, analytics,
            realtime, production hardening.
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
          <h2 style={{ margin: 0 }}>Platform capabilities</h2>
          <ul className="muted">
            <li>Session auth + demo header auth for tools</li>
            <li>Contacts, notes, inbox, assignment</li>
            <li>Idempotent WhatsApp webhooks + automations</li>
            <li>Broadcasts, templates, 24h service window</li>
            <li>AI suggest-reply with org budget metering</li>
            <li>Analytics, SSE events, feature flags, worker drain</li>
          </ul>
        </section>
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Quick links</h2>
          <div className="row">
            <Link className="btn" href="/contacts">
              Contacts
            </Link>
            <Link className="btn" href="/broadcasts">
              Broadcasts
            </Link>
            <Link className="btn" href="/automations">
              Automations
            </Link>
            <Link className="btn" href="/analytics">
              Analytics
            </Link>
            <Link className="btn" href="/settings">
              Settings
            </Link>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Demo login: admin@demo.local / demo-password
          </p>
        </section>
      </div>
    </div>
  );
}
