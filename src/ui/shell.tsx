"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/ui/api-client";
import { AuthGate } from "@/ui/auth-gate";
import { useSession } from "@/ui/session";

const tenantLinks = [
  { href: "/", label: "Overview" },
  { href: "/contacts", label: "Contacts" },
  { href: "/inbox", label: "Inbox" },
  { href: "/broadcasts", label: "Broadcasts" },
  { href: "/automations", label: "Automations" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" }
];

const adminLinks = [
  { href: "/admin", label: "Tenants" },
  { href: "/admin/tenants/new", label: "Create tenant" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    session,
    setSession,
    authenticated,
    refreshMe,
    isPlatformAdmin,
    isPlatformHome,
    isTenantWorkspace,
    memberships
  } = useSession();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAdminArea = pathname.startsWith("/admin");
  const [workspaces, setWorkspaces] = useState<
    Array<{ organizationId: string; name: string; role: string }>
  >([]);

  useEffect(() => {
    if (!authenticated) {
      setWorkspaces([]);
      return;
    }
    void apiFetch<{
      data: Array<{ organizationId: string; name: string; role: string }>;
    }>("/api/v1/org/organizations", session)
      .then((res) => setWorkspaces(res.data))
      .catch(() => setWorkspaces(memberships.map((m) => ({
        organizationId: m.organizationId,
        name: m.name ?? m.organizationId,
        role: m.role
      }))));
  }, [authenticated, session, memberships]);

  if (isAuthPage) {
    return (
      <AuthGate>
        <main className="main">{children}</main>
      </AuthGate>
    );
  }

  async function logout() {
    try {
      await apiFetch("/api/v1/auth/logout", session, { method: "POST" });
    } catch {
      // ignore
    }
    await refreshMe();
    router.replace("/login");
  }

  async function returnToPlatform() {
    try {
      await apiFetch("/api/v1/platform/return", session, { method: "POST" });
      await refreshMe();
      router.push("/admin");
    } catch {
      // ignore
    }
  }

  async function switchWorkspace(organizationId: string) {
    if (isPlatformAdmin) {
      await apiFetch("/api/v1/platform/tenants/enter", session, {
        method: "POST",
        body: JSON.stringify({ organizationId })
      });
    } else {
      await apiFetch("/api/v1/auth/switch-org", session, {
        method: "POST",
        body: JSON.stringify({ organizationId })
      });
    }
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
    router.push("/");
  }

  const useAdminNav = isAdminArea || isPlatformHome;
  const links = useAdminNav ? adminLinks : tenantLinks;
  // Hide tenant workspace chrome on pure platform home; show it in tenant or mixed views.
  const showTenantChrome = isTenantWorkspace && !useAdminNav;

  return (
    <AuthGate>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <strong>Verbal CRM</strong>
            <span>
              {useAdminNav
                ? "Platform admin"
                : session.organizationName ?? "Tenant workspace"}
            </span>
          </div>

          <nav className="nav" aria-label="Primary">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "active" : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="session-bar">
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {useAdminNav
                ? "Platform control plane"
                : isPlatformAdmin && isTenantWorkspace
                  ? "Viewing tenant as platform admin"
                  : authenticated
                    ? "Signed in"
                    : "Not signed in"}
            </div>
            <div style={{ fontSize: "0.85rem" }}>
              <strong>{session.name ?? session.email ?? "—"}</strong>
              <div className="muted">{session.email}</div>
              {showTenantChrome && session.organizationName ? (
                <div className="muted">
                  {session.organizationName}
                  {session.role !== "platform" ? ` · ${session.role}` : ""}
                </div>
              ) : null}
            </div>

            {showTenantChrome && workspaces.length > 0 ? (
              <label className="label">
                Workspace
                <select
                  className="select"
                  value={session.organizationId}
                  onChange={(e) => void switchWorkspace(e.target.value)}
                  aria-label="Switch workspace"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.organizationId} value={ws.organizationId}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="row">
              {isPlatformAdmin && isTenantWorkspace && !useAdminNav ? (
                <button className="btn" type="button" onClick={() => void returnToPlatform()}>
                  Exit to admin
                </button>
              ) : null}
              {isPlatformAdmin && !useAdminNav ? (
                <Link className="btn" href="/admin">
                  Admin
                </Link>
              ) : null}
              {useAdminNav && isTenantWorkspace ? (
                <button className="btn" type="button" onClick={() => void returnToPlatform()}>
                  Clear tenant session
                </button>
              ) : null}
              <button className="btn btn-ghost" type="button" onClick={() => void logout()}>
                Logout
              </button>
            </div>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </AuthGate>
  );
}
