"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshMe } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/auth/register", null, {
        method: "POST",
        body: JSON.stringify({ name, email, password, organizationName })
      });
      await refreshMe();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "3rem auto" }}>
      <header className="page-header">
        <div>
          <h1>Create workspace</h1>
          <p>Register an admin user and organization.</p>
        </div>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      <form className="card stack" onSubmit={onSubmit}>
        <label className="label">
          Your name
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="label">
          Work email
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="label">
          Password
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="label">
          Organization name
          <input
            className="input"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create workspace"}
        </button>
        <Link href="/login" className="muted">
          Already have an account?
        </Link>
      </form>
    </div>
  );
}
