"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe } = useSession();
  const [email, setEmail] = useState("platform@verbal.local");
  const [password, setPassword] = useState("demo-password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const login = await apiFetch<{
        data: {
          role: string;
          isPlatformAdmin?: boolean;
          organizationId: string;
        };
      }>("/api/v1/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const me = await refreshMe();
      if (login.data.role === "platform" || me?.user.isPlatformAdmin) {
        if (login.data.role === "platform") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else if ((me?.memberships.length ?? 0) > 1) {
        router.push("/select-workspace");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "4rem auto" }}>
      <header className="page-header">
        <div>
          <h1>Sign in</h1>
          <p>Platform admins manage tenants. Tenant users enter their workspace.</p>
        </div>
      </header>
      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      <form className="card stack" onSubmit={onSubmit}>
        <label className="label">
          Email
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
        <div className="muted" style={{ fontSize: "0.85rem" }}>
          <div>
            <strong>Platform admin:</strong> platform@verbal.local / demo-password
          </div>
          <div>
            <strong>Tenant admin:</strong> admin@demo.local / demo-password
          </div>
        </div>
        <Link href="/register" className="muted">
          Create a new tenant organization →
        </Link>
      </form>
    </div>
  );
}
