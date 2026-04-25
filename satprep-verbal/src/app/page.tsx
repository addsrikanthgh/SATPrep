import { StudyClient } from "@/components/study-client";
import { AppMenu } from "@/components/app-menu";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">SAT Prep</h1>
          <AppMenu />
        </div>
      </section>

      <StudyClient />
    </main>
  );
}
