"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { apiFetch } from "@/ui/api-client";
import { useSession } from "@/ui/session";

const links = [
  { href: "/", label: "Overview" },
  { href: "/contacts", label: "Contacts" },
  { href: "/inbox", label: "Inbox" },
  { href: "/broadcasts", label: "Broadcasts" },
  { href: "/automations", label: "Automations" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, setSession, authenticated, refreshMe } = useSession();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isAuthPage) {
    return <main className="main">{children}</main>;
  }

  async function logout() {
    try {
      await apiFetch("/api/v1/auth/logout", session, { method: "POST" });
    } catch {
      // ignore
    }
    await refreshMe();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Verbal CRM</strong>
          <span>Phases 1–5 complete</span>
        </div>
        <nav className="nav" aria-label="Primary">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
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
            {authenticated ? "Cookie session" : "Demo header session"}
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            <strong>{session.name ?? session.userId}</strong>
            <div className="muted">{session.email ?? "—"}</div>
            <div className="muted">
              {session.organizationId} · {session.role}
            </div>
          </div>
          <label className="label">
            Organization (header override)
            <input
              className="input"
              value={session.organizationId}
              onChange={(event) =>
                setSession({ ...session, organizationId: event.target.value })
              }
              aria-label="Organization ID"
            />
          </label>
          <label className="label">
            Role override
            <select
              className="select"
              value={session.role}
              onChange={(event) =>
                setSession({
                  ...session,
                  role: event.target.value as SessionContext["role"]
                })
              }
              aria-label="Role"
            >
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="agent">agent</option>
            </select>
          </label>
          <div className="row">
            <Link className="btn" href="/login">
              Login
            </Link>
            <button className="btn btn-ghost" type="button" onClick={() => void logout()}>
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

type SessionContext = {
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "agent";
};
