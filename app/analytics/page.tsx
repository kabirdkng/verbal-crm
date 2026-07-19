"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Overview = {
  contacts: number;
  conversations: number;
  openConversations: number;
  messages: { total: number; inbound: number; outbound: number };
  ai: { calls: number; estimatedCostUsd: number };
  broadcasts: { total: number; sent: number };
};

export default function AnalyticsPage() {
  const { session } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetch<{ data: Overview }>("/api/v1/analytics/overview", session);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const source = new EventSource("/api/v1/events/stream");
    // EventSource cannot set custom headers; rely on cookie session when logged in.
    // For header-auth demo, SSE may 401 — UI still works without live stream.
    source.onmessage = (event) => {
      setEvents((prev) => [event.data, ...prev].slice(0, 12));
    };
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, []);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Tenant-scoped operational metrics and live domain events.</p>
        </div>
        <button className="btn" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      {data ? (
        <div className="stats" style={{ marginBottom: "1rem" }}>
          <div className="stat">
            <span className="muted">Contacts</span>
            <strong>{data.contacts}</strong>
          </div>
          <div className="stat">
            <span className="muted">Open conversations</span>
            <strong>{data.openConversations}</strong>
          </div>
          <div className="stat">
            <span className="muted">Messages in/out</span>
            <strong>
              {data.messages.inbound}/{data.messages.outbound}
            </strong>
          </div>
          <div className="stat">
            <span className="muted">AI cost (USD)</span>
            <strong>${data.ai.estimatedCostUsd.toFixed(6)}</strong>
          </div>
          <div className="stat">
            <span className="muted">Broadcasts sent</span>
            <strong>{data.broadcasts.sent}</strong>
          </div>
          <div className="stat">
            <span className="muted">AI calls</span>
            <strong>{data.ai.calls}</strong>
          </div>
        </div>
      ) : null}
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Realtime events</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          SSE from `/api/v1/events/stream` (cookie session). Header-only demo may not stream.
        </p>
        {events.length === 0 ? (
          <div className="empty">No live events yet — send a WhatsApp webhook to generate some.</div>
        ) : (
          <ul className="muted">
            {events.map((event, index) => (
              <li key={`${index}-${event.slice(0, 12)}`} style={{ marginBottom: "0.35rem" }}>
                <code>{event}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
