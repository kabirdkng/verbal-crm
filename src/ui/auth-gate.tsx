"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/ui/session";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Routes users through platform-admin home vs tenant workspace after auth.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, loading, isPlatformHome, isPlatformAdmin, isTenantWorkspace, memberships } =
    useSession();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAdminRoute = pathname.startsWith("/admin");
  const isSelectWorkspace = pathname.startsWith("/select-workspace");

  useEffect(() => {
    if (loading) return;

    if (!authenticated && !isPublic) {
      router.replace("/login");
      return;
    }

    if (authenticated && isPublic) {
      if (isPlatformHome || (isPlatformAdmin && !isTenantWorkspace)) {
        router.replace("/admin");
      } else if (!isTenantWorkspace && memberships.length > 1) {
        router.replace("/select-workspace");
      } else {
        router.replace("/");
      }
      return;
    }

    if (authenticated && isPlatformHome && !isAdminRoute && !isSelectWorkspace) {
      router.replace("/admin");
      return;
    }

    if (authenticated && isAdminRoute && !isPlatformAdmin) {
      // Only platform admins may use /admin control plane.
      router.replace("/");
      return;
    }

    // Platform admin browsing /admin while still "in" a tenant session is allowed
    // (session stays on the tenant until they Exit to admin / re-enter).
  }, [
    loading,
    authenticated,
    isPublic,
    isPlatformHome,
    isPlatformAdmin,
    isTenantWorkspace,
    isAdminRoute,
    isSelectWorkspace,
    memberships.length,
    pathname,
    router
  ]);

  if (loading) {
    return (
      <main className="main">
        <div className="empty">Loading session…</div>
      </main>
    );
  }

  return <>{children}</>;
}
