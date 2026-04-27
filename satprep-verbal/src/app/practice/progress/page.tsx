import { AppShell } from "@/components/app-shell";
import { ProgressClient } from "@/components/progress-client";

export default function ProgressPage() {
  return (
    <AppShell
      eyebrow="SAT Verbal Performance"
      title="Quiz Scores and Progress"
      subtitle="Review recent quizzes, score trends, and weak-word performance in one dashboard."
      maxWidthClassName="max-w-6xl"
    >
      <ProgressClient />
    </AppShell>
  );
}
