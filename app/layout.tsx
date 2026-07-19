import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/ui/shell";
import { SessionProvider } from "@/ui/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verbal CRM",
  description: "Multi-tenant AI-first customer communication platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
