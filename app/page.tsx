"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Counts = {
  contacts: number;
  conversations: number;
  templates: number;
};

export default function HomePage() {
  const { session } = useSession();
  const [counts, setCounts] = useState<Counts>({ contacts: 0, conversations: 0, templates: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const [contacts, conversations, templates] = await Promise.all([
          apiFetch<{ data: unknown[] }>("/api/v1/contacts", session),
          apiFetch<{ data: unknown[] }>("/api/v1/conversations", session),
          apiFetch<{ data: unknown[] }>("/api/v1/templates", session)
        ]);
        if (!cancelled) {
          setCounts({
            contacts: contacts.data.length,
            conversations: conversations.data.length,
            templates: templates.data.length
          });
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
          <p>Tenant-safe contacts, WhatsApp inbox, templates, and AI assist.</p>
        </div>
        <Link className="btn btn-primary" href="/inbox">
          Open inbox
        </Link>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stats" style={{ marginBottom: "1rem" }}>
        <div className="stat">
          <span className="muted">Contacts</span>
          <strong>{counts.contacts}</strong>
        </div>
        <div className="stat">
          <span className="muted">Conversations</span>
          <strong>{counts.conversations}</strong>
        </div>
        <div className="stat">
          <span className="muted">Templates</span>
          <strong>{counts.templates}</strong>
        </div>
      </div>

      <div className="grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Phase 1 capabilities</h2>
          <ul className="muted">
            <li>RBAC-protected REST API under `/api/v1`</li>
            <li>Organization-scoped contacts and conversations</li>
            <li>Idempotent WhatsApp webhook ingestion + queue worker</li>
            <li>24-hour service window with approved templates</li>
            <li>AI reply suggestions with usage metering</li>
            <li>Audit trail for sensitive actions</li>
          </ul>
        </section>
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Quick start</h2>
          <ol className="muted">
            <li>Create a contact under Contacts</li>
            <li>Open a conversation from Inbox or simulate a webhook</li>
            <li>Reply free-form (in window) or with a template</li>
            <li>Use AI Suggest for a draft reply</li>
          </ol>
          <div className="row">
            <Link className="btn" href="/contacts">
              Manage contacts
            </Link>
            <Link className="btn" href="/settings">
              Templates & usage
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
