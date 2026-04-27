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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
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
      <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 sm:p-5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-blue-600">
            <InfoIcon />
          </span>
          <p>
            Each passage appears only once per student profile. If you revisit a question later, the passage text remains
            hidden and you can focus on test-day recall behavior.
          </p>
        </div>
      </section>

      <PassagePracticeClient />
    </AppShell>
  );
}
