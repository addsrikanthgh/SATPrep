import { AppMenu } from "@/components/app-menu";
import { DataManagementClient } from "@/components/data-management-client";

export default function DataManagementPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SAT Prep</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Data Management</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Backup your progress, restore from a backup, or clear all data for a fresh start.
          </p>
          <AppMenu />
        </div>
      </section>

      <DataManagementClient />
    </main>
  );
}
