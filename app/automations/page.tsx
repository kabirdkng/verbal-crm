"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  matchKeyword: string;
  templateName: string;
};

type Template = { name: string; status: string };

export default function AutomationsPage() {
  const { session } = useSession();
  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("Pricing keyword");
  const [matchKeyword, setMatchKeyword] = useState("pricing");
  const [templateName, setTemplateName] = useState("auto_ack");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rulesResult, templatesResult] = await Promise.all([
        apiFetch<{ data: Rule[] }>("/api/v1/automations", session),
        apiFetch<{ data: Template[] }>("/api/v1/templates", session)
      ]);
      setRules(rulesResult.data);
      setTemplates(templatesResult.data.filter((t) => t.status === "approved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automations");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/v1/automations", session, {
        method: "POST",
        body: JSON.stringify({ name, matchKeyword, templateName, enabled: true })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Automations</h1>
          <p>Keyword rules that fire after inbound WhatsApp processing (worker path).</p>
        </div>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Rules</h2>
          {rules.length === 0 ? (
            <div className="empty">No automation rules.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Keyword</th>
                  <th>Template</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.name}</td>
                    <td className="muted">{rule.matchKeyword}</td>
                    <td className="muted">{rule.templateName}</td>
                    <td>
                      <span className={`badge ${rule.enabled ? "ok" : "warn"}`}>
                        {rule.enabled ? "enabled" : "disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>New rule</h2>
          <form className="stack" onSubmit={onSubmit}>
            <label className="label">
              Name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="label">
              Match keyword
              <input
                className="input"
                value={matchKeyword}
                onChange={(e) => setMatchKeyword(e.target.value)}
                required
              />
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
            <button className="btn btn-primary" type="submit">
              Create rule
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
