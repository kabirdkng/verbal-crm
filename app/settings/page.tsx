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
  budget?: {
    budgetUsd: number;
    spentUsd: number;
    remainingUsd: number;
    percentUsed: number;
  };
  records: Array<{
    id: string;
    feature: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    estimatedCostUsd: number;
    actorUserId?: string;
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

type VoiceAgent = {
  enabled: boolean;
  companyName: string;
  agentName: string;
  systemPrompt: string;
  knowledgeBase: string;
  firstMessage: string;
  language: string;
  voiceProvider: string;
  voiceId: string;
  model: string;
  hasVapiApiKey: boolean;
  vapiPhoneNumberId: string | null;
  vapiAssistantId: string | null;
  vapiMode: "mock" | "vapi";
  platformPhoneConfigured: boolean;
  supportsInbound?: boolean;
  supportsOutbound?: boolean;
  webhookPath?: string;
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
  const [voice, setVoice] = useState<VoiceAgent | null>(null);
  const [vapiApiKeyInput, setVapiApiKeyInput] = useState("");
  const [voiceSaved, setVoiceSaved] = useState<string | null>(null);
  const [simulateFrom, setSimulateFrom] = useState("+15551239999");
  const [simulateNote, setSimulateNote] = useState<string | null>(null);

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

      try {
        const voiceResult = await apiFetch<{ data: VoiceAgent }>(
          "/api/v1/org/voice-agent",
          session
        );
        setVoice(voiceResult.data);
      } catch {
        setVoice(null);
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

  async function saveVoiceAgent(event: FormEvent) {
    event.preventDefault();
    if (!voice) return;
    setError(null);
    setVoiceSaved(null);
    try {
      const payload: Record<string, unknown> = {
        enabled: voice.enabled,
        companyName: voice.companyName,
        agentName: voice.agentName,
        systemPrompt: voice.systemPrompt,
        knowledgeBase: voice.knowledgeBase,
        firstMessage: voice.firstMessage,
        language: voice.language,
        voiceProvider: voice.voiceProvider,
        voiceId: voice.voiceId,
        model: voice.model,
        vapiPhoneNumberId: voice.vapiPhoneNumberId,
        vapiAssistantId: voice.vapiAssistantId
      };
      if (vapiApiKeyInput.trim()) {
        payload.vapiApiKey = vapiApiKeyInput.trim();
      }
      const result = await apiFetch<{ data: VoiceAgent }>("/api/v1/org/voice-agent", session, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setVoice(result.data);
      setVapiApiKeyInput("");
      setVoiceSaved("AI voice agent context saved. Used for Vapi calls and chat assist.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save voice agent");
    }
  }

  async function exportData() {
    setError(null);
    try {
      const result = await apiFetch<{ data: unknown }>("/api/v1/org/export", session);
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verbal-crm-export-${session.organizationId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function toggleFlag(key: string, enabled: boolean) {
    setError(null);
    try {
      await apiFetch("/api/v1/flags", session, {
        method: "PATCH",
        body: JSON.stringify({ key, enabled })
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag update failed");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Templates, AI usage, export, flags, and audit.</p>
        </div>
        <button className="btn" type="button" onClick={() => void exportData()}>
          Export org data
        </button>
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
            <h2 style={{ margin: 0 }}>AI voice agent (Vapi)</h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Tenant context powers <strong>inbound</strong> (customers call you) and{" "}
              <strong>outbound</strong> (you call contacts) AI voice, plus chat assist. Mode:{" "}
              <strong>{voice?.vapiMode ?? "mock"}</strong>
              {voice?.platformPhoneConfigured ? " · phone number configured" : " · set phone number id"}
              {voice?.webhookPath ? (
                <>
                  {" "}
                  · webhook <code>{voice.webhookPath}</code>
                </>
              ) : null}
            </p>
            {voiceSaved ? (
              <div className="card" style={{ borderColor: "#1f6b57", margin: 0 }}>
                {voiceSaved}
              </div>
            ) : null}
            {voice ? (
              <form className="stack" onSubmit={saveVoiceAgent}>
                <label className="label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={voice.enabled}
                    onChange={(e) => setVoice({ ...voice, enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <label className="label">
                  Company name
                  <input
                    className="input"
                    value={voice.companyName}
                    onChange={(e) => setVoice({ ...voice, companyName: e.target.value })}
                    required
                  />
                </label>
                <label className="label">
                  Agent name
                  <input
                    className="input"
                    value={voice.agentName}
                    onChange={(e) => setVoice({ ...voice, agentName: e.target.value })}
                    required
                  />
                </label>
                <label className="label">
                  System prompt (persona)
                  <textarea
                    className="textarea"
                    value={voice.systemPrompt}
                    onChange={(e) => setVoice({ ...voice, systemPrompt: e.target.value })}
                    required
                    rows={4}
                  />
                </label>
                <label className="label">
                  Knowledge base / FAQs / policies
                  <textarea
                    className="textarea"
                    value={voice.knowledgeBase}
                    onChange={(e) => setVoice({ ...voice, knowledgeBase: e.target.value })}
                    rows={5}
                    placeholder="Hours, pricing rules, product facts, escalation policy…"
                  />
                </label>
                <label className="label">
                  First message (call opening)
                  <input
                    className="input"
                    value={voice.firstMessage}
                    onChange={(e) => setVoice({ ...voice, firstMessage: e.target.value })}
                    required
                  />
                </label>
                <div className="row">
                  <label className="label" style={{ flex: 1 }}>
                    Language
                    <input
                      className="input"
                      value={voice.language}
                      onChange={(e) => setVoice({ ...voice, language: e.target.value })}
                    />
                  </label>
                  <label className="label" style={{ flex: 1 }}>
                    Model
                    <input
                      className="input"
                      value={voice.model}
                      onChange={(e) => setVoice({ ...voice, model: e.target.value })}
                    />
                  </label>
                </div>
                <div className="row">
                  <label className="label" style={{ flex: 1 }}>
                    Voice provider
                    <input
                      className="input"
                      value={voice.voiceProvider}
                      onChange={(e) => setVoice({ ...voice, voiceProvider: e.target.value })}
                    />
                  </label>
                  <label className="label" style={{ flex: 1 }}>
                    Voice ID
                    <input
                      className="input"
                      value={voice.voiceId}
                      onChange={(e) => setVoice({ ...voice, voiceId: e.target.value })}
                    />
                  </label>
                </div>
                <hr style={{ borderColor: "var(--border)", width: "100%" }} />
                <h3 style={{ margin: 0 }}>Vapi credentials (optional per tenant)</h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                  Falls back to platform <code>VAPI_API_KEY</code> / <code>VAPI_PHONE_NUMBER_ID</code>.
                  {voice.hasVapiApiKey ? " API key is set." : " No API key yet."}
                </p>
                <label className="label">
                  Vapi API key {voice.hasVapiApiKey ? "(leave blank to keep)" : ""}
                  <input
                    className="input"
                    type="password"
                    autoComplete="off"
                    value={vapiApiKeyInput}
                    onChange={(e) => setVapiApiKeyInput(e.target.value)}
                    placeholder={voice.hasVapiApiKey ? "••••••••" : "sk-…"}
                  />
                </label>
                <label className="label">
                  Vapi phone number ID
                  <input
                    className="input"
                    value={voice.vapiPhoneNumberId ?? ""}
                    onChange={(e) =>
                      setVoice({ ...voice, vapiPhoneNumberId: e.target.value || null })
                    }
                    placeholder="phone number id from Vapi dashboard"
                  />
                </label>
                <label className="label">
                  Vapi assistant ID (optional fixed assistant)
                  <input
                    className="input"
                    value={voice.vapiAssistantId ?? ""}
                    onChange={(e) =>
                      setVoice({ ...voice, vapiAssistantId: e.target.value || null })
                    }
                    placeholder="leave empty to use transient assistant from context"
                  />
                </label>
                <button className="btn btn-primary" type="submit">
                  Save voice agent
                </button>
              </form>
            ) : (
              <div className="empty">Voice agent settings unavailable for this session.</div>
            )}
            {voice?.vapiMode === "mock" || true ? (
              <div className="stack" style={{ marginTop: "0.5rem" }}>
                <h3 style={{ margin: 0 }}>Simulate inbound call (mock / local)</h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                  Pretend a customer dialed your Vapi number. Creates contact, conversation, and an
                  inbound AI call record.
                </p>
                {simulateNote ? (
                  <div className="card" style={{ borderColor: "#1f6b57", margin: 0 }}>
                    {simulateNote}
                  </div>
                ) : null}
                <label className="label">
                  Caller phone
                  <input
                    className="input"
                    value={simulateFrom}
                    onChange={(e) => setSimulateFrom(e.target.value)}
                  />
                </label>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    void (async () => {
                      setSimulateNote(null);
                      setError(null);
                      try {
                        const result = await apiFetch<{
                          data: { id: string; status: string; conversationId: string | null };
                        }>("/api/v1/calls/vapi/simulate-inbound", session, {
                          method: "POST",
                          body: JSON.stringify({ from: simulateFrom })
                        });
                        setSimulateNote(
                          `Inbound AI call ${result.data.status} · id ${result.data.id}` +
                            (result.data.conversationId
                              ? ` · open inbox conversation ${result.data.conversationId}`
                              : "")
                        );
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "Simulate inbound failed"
                        );
                      }
                    })();
                  }}
                >
                  Simulate inbound Vapi call
                </button>
              </div>
            ) : null}
          </section>

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
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Visible to all teammates so everyone can use AI effectively within budget.
            </p>
            {usage ? (
              <>
                <div className="stat">
                  <span className="muted">Total estimated cost (USD)</span>
                  <strong>${usage.totalEstimatedCostUsd.toFixed(6)}</strong>
                </div>
                {usage.budget ? (
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    Budget ${usage.budget.budgetUsd.toFixed(2)} · remaining $
                    {usage.budget.remainingUsd.toFixed(4)} ({usage.budget.percentUsed}% used)
                  </div>
                ) : null}
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
              <div className="empty">Could not load AI usage for this session.</div>
            )}
          </section>

          <section className="card stack">
            <h2 style={{ margin: 0 }}>Feature flags</h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Admin can toggle global flags (broadcasts, automations, analytics, realtime, ai_assist, whatsapp_calling).
            </p>
            <div className="row">
              {["broadcasts", "automations", "analytics", "realtime", "ai_assist", "whatsapp_calling"].map((key) => (
                <button
                  key={key}
                  className="btn"
                  type="button"
                  onClick={() => void toggleFlag(key, true)}
                >
                  Enable {key}
                </button>
              ))}
            </div>
            <div className="row">
              {["broadcasts", "automations", "analytics", "realtime", "ai_assist", "whatsapp_calling"].map((key) => (
                <button
                  key={`off-${key}`}
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => void toggleFlag(key, false)}
                >
                  Disable {key}
                </button>
              ))}
            </div>
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
