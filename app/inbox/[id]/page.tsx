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

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { session } = useSession();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [conversationResult, messagesResult, templatesResult] = await Promise.all([
        apiFetch<{ data: Conversation }>(`/api/v1/conversations/${conversationId}`, session),
        apiFetch<{ data: Message[] }>(
          `/api/v1/conversations/${conversationId}/messages`,
          session
        ),
        apiFetch<{ data: Template[] }>("/api/v1/templates", session)
      ]);
      setConversation(conversationResult.data);
      setMessages(messagesResult.data);
      setTemplates(templatesResult.data.filter((item) => item.status === "approved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    }
  }, [conversationId, session]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function suggestReply() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{
        data: { suggestion: string; usage: { estimatedCostUsd: number } };
      }>("/api/v1/ai/suggest-reply", session, {
        method: "POST",
        body: JSON.stringify({ conversationId })
      });
      setSuggestion(result.data.suggestion);
      setBody(result.data.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI suggestion failed");
    } finally {
      setBusy(false);
    }
  }

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
          </div>
        ) : null}
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}

      <section className="card stack">
        {conversation ? (
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {conversation.phone}
            {conversation.lastInboundAt
              ? ` · last inbound ${new Date(conversation.lastInboundAt).toLocaleString()}`
              : " · no inbound yet"}
          </div>
        ) : (
          <div className="empty">Loading conversation…</div>
        )}

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
          {suggestion ? (
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              AI suggestion loaded into composer (metered per organization).
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
                  : "Outside window — pick an approved template or paste template body"
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
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => void suggestReply()}
            >
              AI suggest reply
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
