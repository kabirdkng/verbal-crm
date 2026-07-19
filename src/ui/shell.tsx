"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/ui/session";

const links = [
  { href: "/", label: "Overview" },
  { href: "/contacts", label: "Contacts" },
  { href: "/inbox", label: "Inbox" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, setSession } = useSession();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Verbal CRM</strong>
          <span>Phase 1 platform</span>
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
            Auth context (Phase 1 headers)
          </div>
          <label className="label">
            Organization
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
            User
            <input
              className="input"
              value={session.userId}
              onChange={(event) => setSession({ ...session, userId: event.target.value })}
              aria-label="User ID"
            />
          </label>
          <label className="label">
            Role
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
