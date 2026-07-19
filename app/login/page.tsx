"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe } = useSession();
  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("demo-password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await refreshMe();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "4rem auto" }}>
      <header className="page-header">
        <div>
          <h1>Sign in</h1>
          <p>Use demo credentials or your registered account.</p>
        </div>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      <form className="card stack" onSubmit={onSubmit}>
        <label className="label">
          Email
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="label">
          Password
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Demo: admin@demo.local / demo-password
        </p>
        <Link href="/register" className="muted">
          Create organization →
        </Link>
      </form>
    </div>
  );
}
