"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Broadcast = {
  id: string;
  name: string;
  templateName: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

type Template = { name: string; status: string };

export default function BroadcastsPage() {
  const { session } = useSession();
  const [items, setItems] = useState<Broadcast[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("Weekly update");
  const [templateName, setTemplateName] = useState("welcome_followup");
  const [tag, setTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [broadcasts, tpls] = await Promise.all([
        apiFetch<{ data: Broadcast[] }>("/api/v1/broadcasts", session),
        apiFetch<{ data: Template[] }>("/api/v1/templates", session)
      ]);
      setItems(broadcasts.data);
      setTemplates(tpls.data.filter((t) => t.status === "approved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load broadcasts");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/v1/broadcasts", session, {
        method: "POST",
        body: JSON.stringify({
          name,
          templateName,
          tag: tag || undefined
        })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broadcast failed");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Broadcasts</h1>
          <p>Send approved templates to all contacts or a tag segment.</p>
        </div>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>History</h2>
          {items.length === 0 ? (
            <div className="empty">No broadcasts yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Template</th>
                  <th>Sent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="muted">{item.templateName}</td>
                    <td>
                      {item.sentCount}/{item.totalRecipients}
                    </td>
                    <td>
                      <span className={`badge ${item.status === "completed" ? "ok" : "warn"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>New broadcast</h2>
          <form className="stack" onSubmit={onSubmit}>
            <label className="label">
              Name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="label">
              Template
              <select
                className="select"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Tag filter (optional)
              <input
                className="input"
                placeholder="vip"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" type="submit">
              Send broadcast
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
