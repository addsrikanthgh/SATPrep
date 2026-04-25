import { AppMenu } from "@/components/app-menu";
import { ProgressClient } from "@/components/progress-client";

export default function ProgressPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SAT Verbal Performance</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Quiz Scores and Progress</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Review your recent quizzes, total score trends, and weak-word progress in one place.
          </p>
          <AppMenu />
        </div>
      </section>

      <ProgressClient />
    </main>
  );
}
