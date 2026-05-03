"use client";

import { useState } from "react";
import { ProgressClient } from "@/components/progress-client";
import { CspPerformanceClient } from "@/components/csp-performance-client";

type PerformanceView = "verbal" | "csp";

export function PerformanceClient() {
  const [view, setView] = useState<PerformanceView>("verbal");

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setView("verbal")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "verbal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Verbal Performance
          </button>
          <button
            type="button"
            onClick={() => setView("csp")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "csp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            AP CSP Performance
          </button>
        </div>
      </section>

      {view === "verbal" ? <ProgressClient /> : <CspPerformanceClient />}
    </div>
  );
}
