import { AppShell } from "@/components/app-shell";
import { PerformanceClient } from "@/components/performance-client";

export default function ProgressPage() {
  return (
    <AppShell
      eyebrow="Performance"
      title="Verbal and AP CSP Performance"
      subtitle="Switch between Verbal and AP CSP dashboards to review sessions, accuracy, and weak areas."
      maxWidthClassName="max-w-6xl"
    >
      <PerformanceClient />
    </AppShell>
  );
}
