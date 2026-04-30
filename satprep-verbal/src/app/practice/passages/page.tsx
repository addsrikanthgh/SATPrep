import { AppShell } from "@/components/app-shell";
import { PassagePracticeClient } from "@/components/passage-practice-client";

function PassageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function PassagePracticePage() {
  return (
    <AppShell
      eyebrow="SAT Verbal Practice"
      title="Passage Quiz"
      subtitle="Read each passage once, answer one SAT-style question, and receive instant explanation feedback."
      headerIcon={<PassageIcon />}
      maxWidthClassName="max-w-5xl"
    >
      <PassagePracticeClient />
    </AppShell>
  );
}
