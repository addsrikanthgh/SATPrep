import { AppShell } from "@/components/app-shell";
import { BlankPracticeClient } from "@/components/blank-practice-client";

export default function BlankPracticePage() {
  return (
    <AppShell
      eyebrow="SAT Verbal Practice"
      title="Blank Sentence Quiz"
      subtitle="Choose the best word for each sentence context using SAT-style multiple-choice options."
      maxWidthClassName="max-w-5xl"
    >
      <BlankPracticeClient />
    </AppShell>
  );
}
