import { AppMenu } from "@/components/app-menu";
import { WeakWordsClient } from "@/components/weak-words-client";

export default function WeakWordsPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SAT Verbal Practice</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Weak Words Tracker</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Review words you miss most often and focus your next practice sessions on them.
          </p>
          <AppMenu />
        </div>
      </section>

      <WeakWordsClient />
    </main>
  );
}
