"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Contact = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: string;
};

export default function ContactsPage() {
  const { session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ data: Contact[] }>("/api/v1/contacts", session);
      setContacts(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/v1/contacts", session, {
        method: "POST",
        body: JSON.stringify({
          fullName,
          phone,
          email: email || undefined
        })
      });
      setFullName("");
      setPhone("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Contacts</h1>
          <p>Organization-scoped customer records used by WhatsApp conversations.</p>
        </div>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Directory</h2>
          {loading ? (
            <div className="empty">Loading contacts…</div>
          ) : contacts.length === 0 ? (
            <div className="empty">No contacts yet. Create the first one.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.fullName}</td>
                    <td>{contact.phone}</td>
                    <td className="muted">{contact.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Create contact</h2>
          <form className="stack" onSubmit={onSubmit}>
            <label className="label">
              Full name
              <input
                className="input"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label className="label">
              Phone
              <input
                className="input"
                required
                placeholder="+15551234567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="label">
              Email (optional)
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="btn btn-primary" type="submit">
              Create contact
            </button>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Agents can view contacts; only admin/manager can create.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
