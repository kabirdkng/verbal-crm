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
import { apiFetch, defaultSession, type SessionContext } from "@/ui/api-client";

type SessionState = {
  session: SessionContext;
  setSession: (next: SessionContext) => void;
  refreshMe: () => Promise<void>;
  authenticated: boolean;
  loading: boolean;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionContext>(defaultSession);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const result = await apiFetch<{
        data: {
          user: { id: string; email: string; name: string };
          organization: { id: string; name: string };
          role: SessionContext["role"];
        };
      }>("/api/v1/auth/me", null);
      setSession({
        userId: result.data.user.id,
        organizationId: result.data.organization.id,
        role: result.data.role,
        email: result.data.user.email,
        name: result.data.user.name
      });
      setAuthenticated(true);
    } catch {
      // Fall back to demo header session for local tools/UAT.
      setAuthenticated(false);
      setSession(defaultSession);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({ session, setSession, refreshMe, authenticated, loading }),
    [session, refreshMe, authenticated, loading]
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
