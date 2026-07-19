"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
};

type OrgOption = {
  organizationId: string;
  name: string;
  role: string;
};

export default function TeamPage() {
  const { session, setSession, refreshMe, isPlatformAdmin } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("agent");
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [membersResult, orgsResult] = await Promise.all([
        apiFetch<{ data: Member[] }>("/api/v1/org/members", session),
        apiFetch<{ data: OrgOption[] }>("/api/v1/org/organizations", session)
      ]);
      setMembers(membersResult.data);
      setOrgs(orgsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setInviteResult(null);
    setError(null);
    try {
      const result = await apiFetch<{
        data: { email: string; temporaryPassword?: string; role: string };
      }>("/api/v1/org/members", session, {
        method: "POST",
        body: JSON.stringify({ email, name: name || undefined, role })
      });
      setInviteResult(
        result.data.temporaryPassword
          ? `Invited ${result.data.email}. Temp password: ${result.data.temporaryPassword}`
          : `Added existing user ${result.data.email} as ${result.data.role}`
      );
      setEmail("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function changeRole(membershipId: string, nextRole: string) {
    setError(null);
    try {
      await apiFetch(`/api/v1/org/members/${membershipId}`, session, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    }
  }

  async function remove(membershipId: string) {
    if (!confirm("Remove this member?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/org/members/${membershipId}`, session, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function switchOrg(organizationId: string) {
    setError(null);
    try {
      // Platform admins enter tenants; tenant users switch membership orgs.
      const path = isPlatformAdmin
        ? "/api/v1/platform/tenants/enter"
        : "/api/v1/auth/switch-org";
      await apiFetch(path, session, {
        method: "POST",
        body: JSON.stringify({ organizationId })
      });
      const me = await refreshMe();
      if (me) {
        setSession({
          userId: me.user.id,
          organizationId: me.organization?.id ?? organizationId,
          role: me.role,
          email: me.user.email,
          name: me.user.name,
          organizationName: me.organization?.name,
          isPlatformAdmin: me.user.isPlatformAdmin
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Switch org failed");
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Team</h1>
          <p>Members, roles, and organization switcher.</p>
        </div>
      </header>

      {error ? <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div> : null}
      {inviteResult ? (
        <div className="card" style={{ marginBottom: "1rem", borderColor: "#1f6b57" }}>
          {inviteResult}
        </div>
      ) : null}

      <div className="grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Members</h2>
          {members.length === 0 ? (
            <div className="empty">No members visible (admin/manager required).</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.name}
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {member.email}
                      </div>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={member.role}
                        onChange={(e) => void changeRole(member.id, e.target.value)}
                      >
                        <option value="admin">admin</option>
                        <option value="manager">manager</option>
                        <option value="agent">agent</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-ghost" type="button" onClick={() => void remove(member.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form className="stack" onSubmit={invite}>
            <h3 style={{ margin: 0 }}>Invite member</h3>
            <label className="label">
              Email
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="label">
              Name (new users)
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="label">
              Role
              <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="agent">agent</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit">
              Invite
            </button>
          </form>
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>Your organizations</h2>
          {orgs.length === 0 ? (
            <div className="empty">No memberships listed.</div>
          ) : (
            <div className="stack">
              {orgs.map((org) => (
                <div key={org.organizationId} className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <strong>{org.name}</strong>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {org.organizationId} · {org.role}
                      {org.organizationId === session.organizationId ? " · active" : ""}
                    </div>
                  </div>
                  {org.organizationId !== session.organizationId ? (
                    <button className="btn" type="button" onClick={() => void switchOrg(org.organizationId)}>
                      Switch
                    </button>
                  ) : (
                    <span className="badge ok">Active</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
