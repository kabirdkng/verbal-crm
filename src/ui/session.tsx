"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { apiFetch, emptySession, type SessionContext } from "@/ui/api-client";

export type MePayload = {
  user: { id: string; email: string; name: string; isPlatformAdmin: boolean };
  organization: { id: string; name: string; slug: string; aiBudgetUsd: number } | null;
  role: SessionContext["role"];
  memberships: Array<{
    organizationId: string;
    role: "admin" | "manager" | "agent";
    name?: string;
    slug?: string;
  }>;
};

type SessionState = {
  session: SessionContext;
  setSession: (next: SessionContext) => void;
  refreshMe: () => Promise<MePayload | null>;
  authenticated: boolean;
  loading: boolean;
  isPlatformAdmin: boolean;
  isPlatformHome: boolean;
  isTenantWorkspace: boolean;
  memberships: MePayload["memberships"];
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionContext>(emptySession);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<MePayload["memberships"]>([]);

  const refreshMe = useCallback(async () => {
    try {
      const result = await apiFetch<{ data: MePayload }>("/api/v1/auth/me", null);
      const me = result.data;
      const next: SessionContext = {
        userId: me.user.id,
        organizationId: me.organization?.id ?? "",
        role: me.role,
        email: me.user.email,
        name: me.user.name,
        organizationName: me.organization?.name,
        isPlatformAdmin: me.user.isPlatformAdmin
      };
      setSession(next);
      setMemberships(me.memberships);
      setAuthenticated(true);
      return me;
    } catch {
      setAuthenticated(false);
      setSession(emptySession);
      setMemberships([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const isPlatformAdmin = Boolean(session.isPlatformAdmin) || session.role === "platform";
  const isPlatformHome = isPlatformAdmin && session.role === "platform";
  const isTenantWorkspace =
    authenticated && Boolean(session.organizationId) && session.role !== "platform";

  const value = useMemo(
    () => ({
      session,
      setSession,
      refreshMe,
      authenticated,
      loading,
      isPlatformAdmin,
      isPlatformHome,
      isTenantWorkspace,
      memberships
    }),
    [
      session,
      refreshMe,
      authenticated,
      loading,
      isPlatformAdmin,
      isPlatformHome,
      isTenantWorkspace,
      memberships
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return value;
}
