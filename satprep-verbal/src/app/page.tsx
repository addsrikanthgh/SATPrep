import { StudyClient } from "@/components/study-client";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell
      eyebrow="SAT Prep"
      title="Study Dashboard"
      subtitle="Pick a quiz mode, practice your vocabulary, and keep your SAT verbal progress moving every day."
      maxWidthClassName="max-w-6xl"
    >
      <StudyClient />
    </AppShell>
  );
}
