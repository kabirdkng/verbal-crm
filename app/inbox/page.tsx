"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Conversation = {
  id: string;
  contactId: string;
  phone: string;
  status: string;
  lastMessageAt: string | null;
  serviceWindowOpen: boolean;
};

type Contact = {
  id: string;
  fullName: string;
  phone: string;
};

export default function InboxPage() {
  const { session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [webhookPhone, setWebhookPhone] = useState("+15559876543");
  const [webhookBody, setWebhookBody] = useState("Hi, I need help with my order");
  const [webhookNote, setWebhookNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [conversationResult, contactResult] = await Promise.all([
        apiFetch<{ data: Conversation[] }>("/api/v1/conversations", session),
        apiFetch<{ data: Contact[] }>("/api/v1/contacts", session)
      ]);
      setConversations(conversationResult.data);
      setContacts(contactResult.data);
      if (!contactId && contactResult.data[0]) {
        setContactId(contactResult.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    }
  }, [session, contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createConversation(event: FormEvent) {
    event.preventDefault();
    if (!contactId) {
      setError("Select a contact first");
      return;
    }
    setError(null);
    try {
      await apiFetch("/api/v1/conversations", session, {
        method: "POST",
        body: JSON.stringify({ contactId })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  }

  async function simulateInboundWebhook(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setWebhookNote(null);
    try {
      const response = await fetch("/api/v1/webhooks/whatsapp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-organization-id": session.organizationId
        },
        body: JSON.stringify({
          organizationId: session.organizationId,
          message: {
            id: `wamid_sim_${crypto.randomUUID()}`,
            from: webhookPhone,
            text: { body: webhookBody },
            profileName: "Webhook Contact"
          }
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Webhook failed");
      }
      setWebhookNote(
        body?.data?.duplicate
          ? "Duplicate webhook ignored (idempotent)."
          : "Inbound webhook accepted and processed."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Webhook simulation failed");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Inbox</h1>
          <p>Conversations scoped to the active organization.</p>
        </div>
        <button className="btn" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      {webhookNote ? (
        <div className="card" style={{ marginBottom: "1rem", borderColor: "#1f6b57" }}>
          {webhookNote}
        </div>
      ) : null}

      <div className="grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Conversations</h2>
          {conversations.length === 0 ? (
            <div className="empty">No conversations yet.</div>
          ) : (
            <div className="conversation-list">
              {conversations.map((conversation) => {
                const contact = contacts.find((item) => item.id === conversation.contactId);
                return (
                  <Link
                    key={conversation.id}
                    href={`/inbox/${conversation.id}`}
                    className="conversation-item"
                  >
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{contact?.fullName ?? conversation.phone}</strong>
                      <span
                        className={`badge ${conversation.serviceWindowOpen ? "ok" : "warn"}`}
                      >
                        {conversation.serviceWindowOpen ? "Window open" : "Template only"}
                      </span>
                    </div>
                    <div className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
                      {conversation.phone} · {conversation.status}
                      {conversation.lastMessageAt
                        ? ` · ${new Date(conversation.lastMessageAt).toLocaleString()}`
                        : ""}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Start conversation</h2>
            <form className="stack" onSubmit={createConversation}>
              <label className="label">
                Contact
                <select
                  className="select"
                  value={contactId}
                  onChange={(event) => setContactId(event.target.value)}
                >
                  <option value="">Select contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.fullName} ({contact.phone})
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" type="submit">
                Open conversation
              </button>
            </form>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>Simulate WhatsApp inbound</h2>
            <form className="stack" onSubmit={simulateInboundWebhook}>
              <label className="label">
                From phone
                <input
                  className="input"
                  value={webhookPhone}
                  onChange={(event) => setWebhookPhone(event.target.value)}
                />
              </label>
              <label className="label">
                Message
                <textarea
                  className="textarea"
                  value={webhookBody}
                  onChange={(event) => setWebhookBody(event.target.value)}
                />
              </label>
              <button className="btn" type="submit">
                Send webhook
              </button>
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Uses `/api/v1/webhooks/whatsapp` with idempotent provider message IDs.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
