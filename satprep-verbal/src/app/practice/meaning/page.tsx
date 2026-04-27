import { AppShell } from "@/components/app-shell";
import { MeaningPracticeClient } from "@/components/meaning-practice-client";

export default function MeaningPracticePage() {
  return (
    <AppShell
      eyebrow="SAT Verbal Practice"
      title="Meaning Quiz by Alphabet"
      subtitle="Practice word meanings with multiple-choice answers and immediate explanation feedback."
      maxWidthClassName="max-w-5xl"
    >
      <MeaningPracticeClient />
    </AppShell>
  );
}
