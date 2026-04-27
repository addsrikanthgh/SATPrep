import { AppMenu } from "@/components/app-menu";
import { PassagePracticeClient } from "@/components/passage-practice-client";

export default function PassagePracticePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SAT Verbal Practice</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Passage Quiz</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Read each passage once, answer a single SAT-style question, and get immediate feedback with explanation.
          </p>
          <AppMenu />
        </div>
      </section>

      <PassagePracticeClient />
    </main>
  );
}
