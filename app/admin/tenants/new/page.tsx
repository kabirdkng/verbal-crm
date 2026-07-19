"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

export default function CreateTenantPage() {
  const { session, isPlatformAdmin } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [aiBudgetUsd, setAiBudgetUsd] = useState("10");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const created = await apiFetch<{
        data: {
          organization: { id: string; name: string };
          owner?: { email: string; temporaryPassword?: string };
        };
      }>("/api/v1/platform/tenants", session, {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          ownerEmail: ownerEmail || undefined,
          ownerName: ownerName || undefined,
          aiBudgetUsd: Number(aiBudgetUsd)
        })
      });
      const ownerNote = created.data.owner?.temporaryPassword
        ? ` Owner ${created.data.owner.email} temp password: ${created.data.owner.temporaryPassword}`
        : created.data.owner
          ? ` Owner ${created.data.owner.email} linked.`
          : "";
      setResult(`Created ${created.data.organization.name}.${ownerNote}`);
      setTimeout(() => router.push("/admin"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isPlatformAdmin) {
    return <div className="empty">Platform admin required.</div>;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <header className="page-header">
        <div>
          <h1>Create tenant</h1>
          <p>
            <Link href="/admin" className="muted">
              ← All tenants
            </Link>
          </p>
        </div>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      {result ? (
        <div className="card" style={{ marginBottom: "1rem", borderColor: "#1f6b57" }}>
          {result}
        </div>
      ) : null}

      <form className="card stack" onSubmit={onSubmit}>
        <label className="label">
          Tenant name
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="label">
          Slug (optional)
          <input
            className="input"
            placeholder="acme-corp"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <label className="label">
          AI budget (USD)
          <input
            className="input"
            type="number"
            min={0}
            value={aiBudgetUsd}
            onChange={(e) => setAiBudgetUsd(e.target.value)}
          />
        </label>
        <hr style={{ borderColor: "var(--border)", width: "100%" }} />
        <h3 style={{ margin: 0 }}>Optional tenant owner</h3>
        <label className="label">
          Owner email
          <input
            className="input"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
          />
        </label>
        <label className="label">
          Owner name
          <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create tenant"}
        </button>
      </form>
    </div>
  );
}
