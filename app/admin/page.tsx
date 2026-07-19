"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  aiBudgetUsd: number;
  createdAt: string;
};

export default function AdminTenantsPage() {
  const { session, refreshMe, isPlatformAdmin } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ data: Tenant[] }>("/api/v1/platform/tenants", session);
      setTenants(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enterTenant(organizationId: string) {
    setError(null);
    try {
      await apiFetch("/api/v1/platform/tenants/enter", session, {
        method: "POST",
        body: JSON.stringify({ organizationId })
      });
      await refreshMe();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enter tenant");
    }
  }

  if (!isPlatformAdmin) {
    return (
      <div className="empty">
        Platform admin access required.{" "}
        <Link href="/login">Sign in as platform@verbal.local</Link>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Tenants</h1>
          <p>Platform control plane — create tenants and open their workspaces.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/tenants/new">
          Create tenant
        </Link>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}

      <section className="card">
        {loading ? (
          <div className="empty">Loading tenants…</div>
        ) : tenants.length === 0 ? (
          <div className="empty">No tenants yet. Create the first organization.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>AI budget</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <strong>{tenant.name}</strong>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {tenant.id}
                    </div>
                  </td>
                  <td className="muted">{tenant.slug}</td>
                  <td>${tenant.aiBudgetUsd}</td>
                  <td className="muted">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => void enterTenant(tenant.id)}
                    >
                      Enter workspace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
