"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Template = {
  id: string;
  name: string;
  language: string;
  body: string;
  status: string;
};

type Usage = {
  totalEstimatedCostUsd: number;
  records: Array<{
    id: string;
    feature: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    estimatedCostUsd: number;
    createdAt: string;
  }>;
};

type AuditEvent = {
  action: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  createdAt?: string;
};

export default function SettingsPage() {
  const { session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("order_update");
  const [body, setBody] = useState("Hi, here is an update on your request.");
  const [status, setStatus] = useState("approved");
  const [aiBudgetUsd, setAiBudgetUsd] = useState("10");
  const [members, setMembers] = useState<Array<{ name: string; email: string; role: string }>>(
    []
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const templatesResult = await apiFetch<{ data: Template[] }>(
        "/api/v1/templates",
        session
      );
      setTemplates(templatesResult.data);

      try {
        const me = await apiFetch<{ data: { organization: { aiBudgetUsd: number } } }>(
          "/api/v1/auth/me",
          session
        );
        setAiBudgetUsd(String(me.data.organization.aiBudgetUsd));
      } catch {
        // header demo without seeded org membership may 401 cookie me — ignore
      }

      try {
        const usageResult = await apiFetch<{ data: Usage }>("/api/v1/ai/usage", session);
        setUsage(usageResult.data);
      } catch {
        setUsage(null);
      }

      try {
        const auditResult = await apiFetch<{ data: AuditEvent[] }>("/api/v1/audit", session);
        setAudit(auditResult.data.slice(-15).reverse());
      } catch {
        setAudit([]);
      }

      try {
        const membersResult = await apiFetch<{
          data: Array<{ name: string; email: string; role: string }>;
        }>("/api/v1/org/members", session);
        setMembers(membersResult.data);
      } catch {
        setMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/v1/templates", session, {
        method: "POST",
        body: JSON.stringify({
          name,
          language: "en",
          body,
          status
        })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    }
  }

  async function saveBudget(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/v1/org/settings", session, {
        method: "PATCH",
        body: JSON.stringify({ aiBudgetUsd: Number(aiBudgetUsd) })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Templates, AI usage metering, and recent audit events.</p>
        </div>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}

      <div className="grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Message templates</h2>
          {templates.length === 0 ? (
            <div className="empty">No templates for this organization.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Body</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>
                      <span
                        className={`badge ${template.status === "approved" ? "ok" : "warn"}`}
                      >
                        {template.status}
                      </span>
                    </td>
                    <td className="muted">{template.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form className="stack" onSubmit={createTemplate}>
            <h3 style={{ margin: 0 }}>Add template</h3>
            <label className="label">
              Name (snake_case)
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="label">
              Body
              <textarea
                className="textarea"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
              />
            </label>
            <label className="label">
              Status
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="draft">draft</option>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit">
              Create template
            </button>
          </form>
        </section>

        <div className="stack">
          <section className="card stack">
            <h2 style={{ margin: 0 }}>Organization AI budget</h2>
            <form className="stack" onSubmit={saveBudget}>
              <label className="label">
                Budget (USD)
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={aiBudgetUsd}
                  onChange={(e) => setAiBudgetUsd(e.target.value)}
                />
              </label>
              <button className="btn" type="submit">
                Save budget
              </button>
            </form>
            {members.length > 0 ? (
              <div>
                <h3 style={{ marginBottom: "0.5rem" }}>Members</h3>
                <ul className="muted">
                  {members.map((member) => (
                    <li key={member.email}>
                      {member.name} · {member.email} · {member.role}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="card stack">
            <h2 style={{ margin: 0 }}>AI usage</h2>
            {usage ? (
              <>
                <div className="stat">
                  <span className="muted">Total estimated cost (USD)</span>
                  <strong>${usage.totalEstimatedCostUsd.toFixed(6)}</strong>
                </div>
                {usage.records.length === 0 ? (
                  <div className="empty">No AI usage recorded yet.</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Tokens</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.records
                        .slice()
                        .reverse()
                        .slice(0, 10)
                        .map((record) => (
                          <tr key={record.id}>
                            <td>
                              {record.feature}
                              <div className="muted" style={{ fontSize: "0.75rem" }}>
                                {record.model}
                              </div>
                            </td>
                            <td>
                              {record.tokensIn}/{record.tokensOut}
                            </td>
                            <td>${record.estimatedCostUsd.toFixed(6)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="empty">AI usage requires admin/manager role.</div>
            )}
          </section>

          <section className="card stack">
            <h2 style={{ margin: 0 }}>Recent audit events</h2>
            {audit.length === 0 ? (
              <div className="empty">No audit events (or insufficient role).</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((event, index) => (
                    <tr key={`${event.entityId}-${index}`}>
                      <td>{event.action}</td>
                      <td className="muted">
                        {event.entityType}:{event.entityId.slice(0, 12)}
                      </td>
                      <td className="muted">{event.actorUserId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
