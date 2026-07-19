"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Conversation = {
  id: string;
  contactId: string;
  phone: string;
  status: string;
  serviceWindowOpen: boolean;
  lastInboundAt: string | null;
  assignedUserId: string | null;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  templateName: string | null;
  createdAt: string;
};

type Template = {
  name: string;
  status: string;
};

type Member = {
  userId: string;
  name: string;
  email: string;
};

type AiBudget = {
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  percentUsed: number;
};

type VoiceCall = {
  id: string;
  status: string;
  direction: string;
  channel?: string;
  provider?: string;
  phone: string;
  durationSeconds: number | null;
  errorMessage: string | null;
  summary?: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

type AiAction = "suggest_reply" | "improve_draft" | "summarize" | "next_steps" | "translate";
type AiTone = "professional" | "friendly" | "empathetic" | "concise" | "formal";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { session } = useSession();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [aiAction, setAiAction] = useState<AiAction>("suggest_reply");
  const [aiTone, setAiTone] = useState<AiTone>("professional");
  const [aiLanguage, setAiLanguage] = useState("es");
  const [aiBudget, setAiBudget] = useState<AiBudget | null>(null);
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);
  const [callHistory, setCallHistory] = useState<VoiceCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [conversationResult, messagesResult, templatesResult, budgetResult, callsResult] =
        await Promise.all([
          apiFetch<{ data: Conversation }>(`/api/v1/conversations/${conversationId}`, session),
          apiFetch<{ data: Message[] }>(
            `/api/v1/conversations/${conversationId}/messages`,
            session
          ),
          apiFetch<{ data: Template[] }>("/api/v1/templates", session),
          apiFetch<{ data: AiBudget }>("/api/v1/ai/budget", session).catch(() => null),
          apiFetch<{ data: VoiceCall[] }>(
            `/api/v1/calls?conversationId=${encodeURIComponent(conversationId)}`,
            session
          ).catch(() => ({ data: [] as VoiceCall[] }))
        ]);
      setConversation(conversationResult.data);
      setMessages(messagesResult.data);
      setTemplates(templatesResult.data.filter((item) => item.status === "approved"));
      if (budgetResult) setAiBudget(budgetResult.data);
      setCallHistory(callsResult.data);
      const live = callsResult.data.find((c) =>
        ["initiated", "ringing", "connecting", "active"].includes(c.status)
      );
      setActiveCall(live ?? null);

      try {
        const membersResult = await apiFetch<{ data: Member[] }>("/api/v1/org/members", session);
        setMembers(membersResult.data);
      } catch {
        setMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    }
  }, [conversationId, session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchConversation(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/conversations/${conversationId}`, session, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/conversations/${conversationId}/messages`, session, {
        method: "POST",
        body: JSON.stringify({
          body: body || undefined,
          templateName: templateName || undefined
        })
      });
      setBody("");
      setTemplateName("");
      setSuggestion(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setBusy(false);
    }
  }

  async function runAi() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{
        data: {
          suggestion: string;
          action: string;
          usage: { estimatedCostUsd: number };
          budget?: AiBudget;
        };
      }>("/api/v1/ai/assist", session, {
        method: "POST",
        body: JSON.stringify({
          conversationId,
          action: aiAction,
          tone: aiTone,
          draft: body || undefined,
          language: aiAction === "translate" ? aiLanguage : undefined
        })
      });
      setSuggestion(result.data.suggestion);
      if (result.data.budget) setAiBudget(result.data.budget);
      // Put draft-ready actions into the composer
      if (
        aiAction === "suggest_reply" ||
        aiAction === "improve_draft" ||
        aiAction === "translate"
      ) {
        setBody(result.data.suggestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI assist failed");
    } finally {
      setBusy(false);
    }
  }

  async function startCall(channel: "whatsapp" | "vapi" = "whatsapp") {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ data: VoiceCall }>("/api/v1/calls", session, {
        method: "POST",
        body: JSON.stringify({ conversationId, channel })
      });
      setActiveCall(result.data);
      if (result.data.status === "failed") {
        setError(result.data.errorMessage ?? "Call failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
    } finally {
      setBusy(false);
    }
  }

  async function requestCallPermission() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/calls/permission-request", session, {
        method: "POST",
        body: JSON.stringify({ conversationId })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permission request failed");
    } finally {
      setBusy(false);
    }
  }

  async function endCall() {
    if (!activeCall) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/calls/${activeCall.id}/terminate`, session, {
        method: "POST",
        body: JSON.stringify({})
      });
      setActiveCall(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end call");
    } finally {
      setBusy(false);
    }
  }

  async function acceptInboundCall() {
    if (!activeCall) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/calls/${activeCall.id}/accept`, session, {
        method: "POST",
        body: JSON.stringify({})
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept call");
    } finally {
      setBusy(false);
    }
  }

  const isLiveCall =
    activeCall && ["initiated", "ringing", "connecting", "active"].includes(activeCall.status);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Conversation</h1>
          <p>
            <Link href="/inbox" className="muted">
              ← Back to inbox
            </Link>
          </p>
        </div>
        {conversation ? (
          <div className="row">
            <span className={`badge ${conversation.serviceWindowOpen ? "ok" : "warn"}`}>
              {conversation.serviceWindowOpen ? "Service window open" : "Template required"}
            </span>
            <span className="badge">{conversation.status}</span>
            {aiBudget ? (
              <span className={`badge ${aiBudget.remainingUsd > 0 ? "ok" : "warn"}`}>
                AI ${aiBudget.remainingUsd.toFixed(2)} left
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}

      {conversation ? (
        <section className="card row" style={{ marginBottom: "1rem" }}>
          <label className="label" style={{ minWidth: 180 }}>
            Status
            <select
              className="select"
              value={conversation.status}
              disabled={busy}
              onChange={(e) => void patchConversation({ status: e.target.value })}
            >
              <option value="open">open</option>
              <option value="pending">pending</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <label className="label" style={{ minWidth: 220 }}>
            Assign to
            <select
              className="select"
              value={conversation.assignedUserId ?? ""}
              disabled={busy}
              onChange={(e) =>
                void patchConversation({
                  assignedUserId: e.target.value || null
                })
              }
            >
              <option value="">Unassigned</option>
              <option value={session.userId}>Me ({session.userId})</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </label>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {conversation.phone}
            {conversation.lastInboundAt
              ? ` · last inbound ${new Date(conversation.lastInboundAt).toLocaleString()}`
              : " · no inbound yet"}
          </div>
          <div className="row">
            {isLiveCall ? (
              <>
                <span className="badge warn">
                  Call {activeCall!.status}
                  {activeCall!.direction === "user_initiated" ? " (inbound)" : ""}
                </span>
                {activeCall!.status === "ringing" &&
                activeCall!.direction === "user_initiated" ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busy}
                    onClick={() => void acceptInboundCall()}
                  >
                    Accept call
                  </button>
                ) : null}
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => void endCall()}
                  style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                >
                  End call
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void startCall("vapi")}
                  title="AI voice agent calls the contact using tenant context (Vapi)"
                >
                  🤖 AI voice call (Vapi)
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => void startCall("whatsapp")}
                >
                  📞 WhatsApp call
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => void requestCallPermission()}
                >
                  Request call permission
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card stack">
          {!conversation ? <div className="empty">Loading conversation…</div> : null}

          <div className="thread" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty">No messages in this thread yet.</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`bubble ${message.direction}`}>
                  {message.body}
                  <small>
                    {message.direction} · {message.status}
                    {message.templateName ? ` · template:${message.templateName}` : ""} ·{" "}
                    {new Date(message.createdAt).toLocaleString()}
                  </small>
                </div>
              ))
            )}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            {suggestion &&
            (aiAction === "summarize" || aiAction === "next_steps") ? (
              <div
                className="card"
                style={{
                  background: "var(--surface-2)",
                  fontSize: "0.9rem",
                  whiteSpace: "pre-wrap"
                }}
              >
                <strong>AI {aiAction.replace("_", " ")}</strong>
                <div style={{ marginTop: "0.5rem" }}>{suggestion}</div>
              </div>
            ) : null}
            {suggestion &&
            (aiAction === "suggest_reply" ||
              aiAction === "improve_draft" ||
              aiAction === "translate") ? (
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                AI result loaded into composer. Edit freely, then send.
              </div>
            ) : null}
            <label className="label">
              Reply
              <textarea
                className="textarea"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={
                  conversation?.serviceWindowOpen
                    ? "Type a free-form reply…"
                    : "Outside window — pick an approved template"
                }
              />
            </label>
            <label className="label">
              Template (required outside 24h window)
              <select
                className="select"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              >
                <option value="">None</option>
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                Send
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => void load()}>
                Refresh
              </button>
            </div>
          </form>
        </section>

        <aside className="stack">
          <section className="card stack">
            <h2 style={{ margin: 0 }}>AI assist</h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Available to every teammate (admin, manager, agent). Usage is metered against the
              org budget.
            </p>
            {aiBudget ? (
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                Budget ${aiBudget.budgetUsd.toFixed(2)} · spent ${aiBudget.spentUsd.toFixed(4)} ·{" "}
                <strong>${aiBudget.remainingUsd.toFixed(4)} remaining</strong> (
                {aiBudget.percentUsed}%)
              </div>
            ) : null}
            <label className="label">
              Action
              <select
                className="select"
                value={aiAction}
                onChange={(e) => setAiAction(e.target.value as AiAction)}
              >
                <option value="suggest_reply">Suggest reply</option>
                <option value="improve_draft">Improve draft</option>
                <option value="summarize">Summarize / handoff</option>
                <option value="next_steps">Next steps</option>
                <option value="translate">Translate</option>
              </select>
            </label>
            <label className="label">
              Tone
              <select
                className="select"
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value as AiTone)}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="empathetic">Empathetic</option>
                <option value="concise">Concise</option>
                <option value="formal">Formal</option>
              </select>
            </label>
            {aiAction === "translate" ? (
              <label className="label">
                Language
                <input
                  className="input"
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  placeholder="es, fr, hi…"
                />
              </label>
            ) : null}
            {aiAction === "improve_draft" ? (
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                Write or paste a draft in the composer first, then run Improve draft.
              </p>
            ) : null}
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy || (aiBudget != null && aiBudget.remainingUsd <= 0)}
              onClick={() => void runAi()}
            >
              Run AI
            </button>
          </section>

          <section className="card stack">
            <h2 style={{ margin: 0 }}>Call history</h2>
            {callHistory.length === 0 ? (
              <div className="empty">No WhatsApp calls yet.</div>
            ) : (
              <ul className="muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {callHistory.slice(0, 8).map((call) => (
                  <li key={call.id} style={{ marginBottom: "0.35rem" }}>
                    <strong>{call.status}</strong> · {call.channel ?? "whatsapp"} ·{" "}
                    {call.direction.replace("_", " ")} ·{" "}
                    {new Date(call.createdAt).toLocaleString()}
                    {call.durationSeconds != null ? ` · ${call.durationSeconds}s` : ""}
                    {call.errorMessage ? ` · ${call.errorMessage}` : ""}
                    {call.summary ? (
                      <div style={{ fontSize: "0.8rem" }}>{call.summary.slice(0, 160)}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              <strong>Vapi</strong> uses your tenant AI voice context (Settings).{" "}
              <strong>WhatsApp</strong> mock simulates VoIP; Meta mode needs calling + SDP.
            </p>
            <Link className="btn" href="/settings">
              Edit AI voice context →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
