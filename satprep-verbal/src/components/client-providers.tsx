"use client";

import { SessionProvider } from "next-auth/react";
import { StudentProvider } from "@/lib/student-context";
import { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <StudentProvider>{children}</StudentProvider>
    </SessionProvider>
  );
}
