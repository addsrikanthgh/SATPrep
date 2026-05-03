import { AppShell } from "@/components/app-shell";
import { ApCspPracticeClient } from "@/components/ap-csp-practice-client";

function CspIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 12h5M8 15h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function ApCspPracticePage() {
  return (
    <AppShell
      eyebrow="AP CSP Prep"
      title="AP CSP Quiz"
      subtitle="Practice AP Computer Science Principles with unit-based MCQs in a full-screen exam flow."
      headerIcon={<CspIcon />}
      maxWidthClassName="max-w-6xl"
    >
      <ApCspPracticeClient />
    </AppShell>
  );
}
