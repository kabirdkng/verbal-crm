"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Contact = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  tags: string[];
};

type Note = {
  id: string;
  body: string;
  authorUserId: string;
  createdAt: string;
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, n] = await Promise.all([
        apiFetch<{ data: Contact }>(`/api/v1/contacts/${id}`, session),
        apiFetch<{ data: Note[] }>(`/api/v1/contacts/${id}/notes`, session)
      ]);
      setContact(c.data);
      setFullName(c.data.fullName);
      setPhone(c.data.phone);
      setEmail(c.data.email ?? "");
      setTags((c.data.tags ?? []).join(", "));
      setNotes(n.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact");
    }
  }, [id, session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/contacts/${id}`, session, {
        method: "PATCH",
        body: JSON.stringify({
          fullName,
          phone,
          email: email || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this contact?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/contacts/${id}`, session, { method: "DELETE" });
      router.push("/contacts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setBusy(false);
    }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/contacts/${id}/notes`, session, {
        method: "POST",
        body: JSON.stringify({ body: noteBody })
      });
      setNoteBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setBusy(false);
    }
  }

  if (!contact && !error) {
    return <div className="empty">Loading…</div>;
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{contact?.fullName ?? "Contact"}</h1>
          <p>
            <Link href="/contacts" className="muted">
              ← Contacts
            </Link>
          </p>
        </div>
        <button className="btn" type="button" disabled={busy} onClick={() => void remove()}>
          Delete
        </button>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Edit</h2>
          <form className="stack" onSubmit={save}>
            <label className="label">
              Full name
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="label">
              Phone
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </label>
            <label className="label">
              Email
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="label">
              Tags
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Save changes
            </button>
          </form>
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>Notes</h2>
          {notes.length === 0 ? (
            <div className="empty">No notes yet.</div>
          ) : (
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {notes.map((note) => (
                <li key={note.id} className="card" style={{ boxShadow: "none" }}>
                  <div>{note.body}</div>
                  <small className="muted">
                    {note.authorUserId} · {new Date(note.createdAt).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <form className="stack" onSubmit={addNote}>
            <textarea
              className="textarea"
              required
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add an internal note…"
            />
            <button className="btn" type="submit" disabled={busy}>
              Add note
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
