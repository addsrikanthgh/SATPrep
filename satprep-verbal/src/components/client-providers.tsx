"use client";

import { StudentProvider } from "@/lib/student-context";
import { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <StudentProvider>{children}</StudentProvider>;
}
