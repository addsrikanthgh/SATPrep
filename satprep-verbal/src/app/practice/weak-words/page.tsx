import { AppShell } from "@/components/app-shell";
import { WeakWordsClient } from "@/components/weak-words-client";

export default function WeakWordsPage() {
  return (
    <AppShell
      eyebrow="SAT Verbal Practice"
      title="Weak Words Tracker"
      subtitle="Focus on the words you miss most often and target the right areas in your next session."
      maxWidthClassName="max-w-6xl"
    >
      <WeakWordsClient />
    </AppShell>
  );
}
