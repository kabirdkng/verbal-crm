"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { defaultSession, type SessionContext } from "@/ui/api-client";

type SessionState = {
  session: SessionContext;
  setSession: (next: SessionContext) => void;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionContext>(defaultSession);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return value;
}
