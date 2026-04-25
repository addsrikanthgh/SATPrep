import { AppMenu } from "@/components/app-menu";
import { BlankPracticeClient } from "@/components/blank-practice-client";

export default function BlankPracticePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SAT Verbal Practice</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Blank Sentence Quiz</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Fill in missing words with multiple-choice answers built from surrounding words in the list.
          </p>
          <AppMenu />
        </div>
      </section>

      <BlankPracticeClient />
    </main>
  );
}
