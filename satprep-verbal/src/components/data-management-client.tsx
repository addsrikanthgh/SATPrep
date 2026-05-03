"use client";

import { useEffect, useRef, useState } from "react";
import { useStudent } from "@/lib/student-context";
import { PassagePreviewSection } from "@/components/passage-preview-section";

type Status = { type: "success" | "error"; message: string } | null;
type ImportError = { file: string; error: string };
type Stats = {
  passageCount: number;
  blankCount: number;
  byDomain: { label: string; count: number }[];
  bySkill: { label: string; count: number }[];
} | null;

export function DataManagementClient() {
  const { student, adminPassword, adminUnlocked } = useStudent();

  const [backupStatus, setBackupStatus] = useState<Status>(null);
  const [clearStatus, setClearStatus] = useState<Status>(null);
  const [restoreStatus, setRestoreStatus] = useState<Status>(null);
  const [wordsImportStatus, setWordsImportStatus] = useState<Status>(null);
  const [blanksImportStatus, setBlanksImportStatus] = useState<Status>(null);
  const [passagesImportStatus, setPassagesImportStatus] = useState<Status>(null);
  const [cspImportStatus, setCspImportStatus] = useState<Status>(null);
  const [passcodeStatus, setPasscodeStatus] = useState<Status>(null);
  const [importPasscode, setImportPasscode] = useState("");
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [stats, setStats] = useState<Stats>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [passageImportErrors, setPassageImportErrors] = useState<ImportError[]>([]);
  const [cspImportErrors, setCspImportErrors] = useState<ImportError[]>([]);
  const [clearing, setClearing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [importingWords, setImportingWords] = useState(false);
  const [importingBlanks, setImportingBlanks] = useState(false);
  const [importingPassages, setImportingPassages] = useState(false);
  const [importingCsp, setImportingCsp] = useState(false);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordsFileInputRef = useRef<HTMLInputElement>(null);
  const blanksFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/admin/stats", {
        headers: { "x-admin-passcode": adminPassword },
      });
      if (response.ok) {
        const data = (await response.json()) as { passageCount: number; blankCount: number; byDomain: { label: string; count: number }[]; bySkill: { label: string; count: number }[] };
        setStats(data);
      } else {
        const errText = await response.text().catch(() => response.status.toString());
        console.error("[fetchStats] non-ok response:", response.status, errText);
      }
    } catch (err) {
      console.error("[fetchStats] threw:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleBackup() {
    setBackupStatus(null);
    try {
      const response = await fetch(`/api/progress/backup`);
      if (!response.ok) {
        setBackupStatus({ type: "error", message: "Failed to fetch backup data." });
        return;
      }
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `satprep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus({ type: "success", message: "Backup downloaded successfully." });
    } catch {
      setBackupStatus({ type: "error", message: "An error occurred during backup." });
    }
  }

  async function handleClear() {
    setClearing(true);
    setClearStatus(null);
    try {
      const response = await fetch("/api/progress/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setClearStatus({ type: "error", message: "Failed to clear progress." });
      } else {
        setClearStatus({ type: "success", message: "All progress cleared successfully." });
      }
    } catch {
      setClearStatus({ type: "error", message: "An error occurred while clearing progress." });
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus(null);
    setRestoring(true);

    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setRestoreStatus({ type: "error", message: "Invalid JSON file." });
        setRestoring(false);
        return;
      }

      const response = await fetch("/api/progress/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(json as object) }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: unknown;
        restored?: { progressRows: number; sessions: number };
      };

      if (!response.ok || !result.success) {
        const msg = typeof result.error === "string" ? result.error : "Failed to restore backup.";
        setRestoreStatus({ type: "error", message: msg });
      } else {
        setRestoreStatus({
          type: "success",
          message: `Restored ${result.restored?.progressRows ?? 0} progress records and ${result.restored?.sessions ?? 0} quiz sessions.`,
        });
      }
    } catch {
      setRestoreStatus({ type: "error", message: "An error occurred while restoring backup." });
    } finally {
      setRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleImportSatWords(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setWordsImportStatus(null);
    setImportingWords(true);

    try {
      const text = await file.text();
      let json: unknown;

      try {
        json = JSON.parse(text);
      } catch {
        setWordsImportStatus({ type: "error", message: "Invalid JSON file." });
        return;
      }

      const words = Array.isArray(json) ? json : null;
      if (!words) {
        setWordsImportStatus({ type: "error", message: "SATWords.json must be a JSON array." });
        return;
      }

      const response = await fetch("/api/words/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words,
          adminPasscode: importPasscode,
          saveToSourceFile: true,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        importedCount?: number;
        skippedMissingWordCount?: number;
        sourceFileUpdated?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        setWordsImportStatus({
          type: "error",
          message: result.error || "Failed to import SATWords data.",
        });
        return;
      }

      setWordsImportStatus({
        type: "success",
        message: `Imported ${result.importedCount ?? 0} words and updated SATWords.json.`,
      });
      setImportPasscode("");
      setPasscodeVerified(false);
      setPasscodeStatus(null);
    } catch {
      setWordsImportStatus({ type: "error", message: "An error occurred while importing SATWords.json." });
    } finally {
      setImportingWords(false);
      if (wordsFileInputRef.current) {
        wordsFileInputRef.current.value = "";
      }
    }
  }

  async function handleImportBlanks(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBlanksImportStatus(null);
    setImportingBlanks(true);

    try {
      const text = await file.text();
      let json: unknown;

      try {
        json = JSON.parse(text);
      } catch {
        setBlanksImportStatus({ type: "error", message: "Invalid JSON file." });
        return;
      }

      const questions = Array.isArray(json) ? json : null;
      if (!questions) {
        setBlanksImportStatus({
          type: "error",
          message: "Question_word_blanks.json must be a JSON array.",
        });
        return;
      }

      const response = await fetch("/api/quiz/blanks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          adminPasscode: importPasscode,
          saveToSourceFile: true,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        importedCount?: number;
        skippedMissingWordCount?: number;
        sourceFileUpdated?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        setBlanksImportStatus({
          type: "error",
          message: result.error || "Failed to import Question_word_blanks.json data.",
        });
        return;
      }

      setBlanksImportStatus({
        type: "success",
        message: `Imported ${result.importedCount ?? 0} blank-question rows and updated Question_word_blanks.json.${
          (result.skippedMissingWordCount ?? 0) > 0
            ? ` Skipped ${result.skippedMissingWordCount} rows because matching words were not found in the Word table.`
            : ""
        }`,
      });
      setImportPasscode("");
      setPasscodeVerified(false);
      setPasscodeStatus(null);
    } catch {
      setBlanksImportStatus({ type: "error", message: "An error occurred while importing Question_word_blanks.json." });
    } finally {
      setImportingBlanks(false);
      if (blanksFileInputRef.current) {
        blanksFileInputRef.current.value = "";
      }
    }
  }

  async function handleVerifyPasscode() {
    setPasscodeStatus(null);

    if (!importPasscode.trim()) {
      setPasscodeVerified(false);
      setPasscodeStatus({ type: "error", message: "Enter passcode before verification." });
      return;
    }

    setVerifyingPasscode(true);

    try {
      const response = await fetch("/api/words/import/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPasscode: importPasscode }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        setPasscodeVerified(false);
        setPasscodeStatus({
          type: "error",
          message: payload.error || "Passcode verification failed.",
        });
        return;
      }

      setPasscodeVerified(true);
      setPasscodeStatus({ type: "success", message: "Passcode verified. You can now choose a file." });
    } catch {
      setPasscodeVerified(false);
      setPasscodeStatus({ type: "error", message: "Unable to verify passcode right now." });
    } finally {
      setVerifyingPasscode(false);
    }
  }

  async function handleImportPassagesFromFolder() {
    setPassagesImportStatus(null);
    setPassageImportErrors([]);
    setImportingPassages(true);

    try {
      const response = await fetch("/api/passage-sets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPasscode: importPasscode }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        imported?: number;
        updated?: number;
        skipped?: number;
        failed?: number;
        visualsImported?: number;
        visualsUpdated?: number;
        error?: string;
        errors?: ImportError[];
      };

      if (!response.ok || !payload.success) {
        setPassagesImportStatus({
          type: "error",
          message: payload.error || "Failed to import passage files from folder.",
        });
        return;
      }

      setPassagesImportStatus({
        type: "success",
        message: `Passage import complete. Visuals: ${(payload.visualsImported ?? 0) + (payload.visualsUpdated ?? 0)} (${payload.visualsImported ?? 0} new, ${payload.visualsUpdated ?? 0} updated). Passages: ${payload.imported ?? 0} new, ${payload.updated ?? 0} updated, ${payload.skipped ?? 0} skipped, ${payload.failed ?? 0} failed.`,
      });
      if (payload.errors && payload.errors.length > 0) {
        setPassageImportErrors(payload.errors);
      }
      void fetchStats();
    } catch {
      setPassagesImportStatus({ type: "error", message: "An error occurred while importing passages." });
    } finally {
      setImportingPassages(false);
    }
  }

  async function handleImportCspFromFolder() {
    setCspImportStatus(null);
    setCspImportErrors([]);
    setImportingCsp(true);

    try {
      const response = await fetch("/api/csp/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPasscode: importPasscode }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        inserted?: number;
        updated?: number;
        failed?: number;
        error?: string;
        errors?: ImportError[];
      };

      if (!response.ok || !payload.success) {
        setCspImportStatus({
          type: "error",
          message: payload.error || "Failed to import AP CSP questions from folder.",
        });
        return;
      }

      setCspImportStatus({
        type: "success",
        message: `AP CSP import complete. ${payload.inserted ?? 0} new, ${payload.updated ?? 0} updated, ${payload.failed ?? 0} failed.`,
      });
      if (payload.errors && payload.errors.length > 0) {
        setCspImportErrors(payload.errors);
      }
    } catch {
      setCspImportStatus({ type: "error", message: "An error occurred while importing AP CSP questions." });
    } finally {
      setImportingCsp(false);
    }
  }

  if (!adminUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-base font-semibold text-slate-700">Admin access required</p>
        <p className="text-sm text-slate-500">
          Enter the admin passcode via the <span className="font-medium">Admin</span> button in the sidebar to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      {/* Question Bank Stats */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-blue-900">Question Bank</h2>
        {statsLoading ? (
          <p className="mt-1 text-sm text-blue-600">Loading stats…</p>
        ) : stats ? (
          <>
            <div className="mt-2 flex gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-800">{stats.passageCount.toLocaleString()}</p>
                <p className="text-xs text-blue-600">Passages</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-800">{stats.blankCount.toLocaleString()}</p>
                <p className="text-xs text-blue-600">Blank Questions</p>
              </div>
            </div>

            {stats.byDomain.length > 0 || stats.bySkill.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* By Domain */}
                {stats.byDomain.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">By Domain</p>
                    <div className="overflow-hidden rounded-lg border border-blue-200 bg-white">
                      {stats.byDomain.map((row) => (
                        <div key={row.label} className="flex items-center justify-between border-b border-blue-100 px-3 py-1.5 last:border-0">
                          <span className="text-xs text-slate-700">{row.label}</span>
                          <span className="text-xs font-semibold text-blue-700">{row.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* By Skill */}
                {stats.bySkill.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">By Skill</p>
                    <div className="overflow-hidden rounded-lg border border-blue-200 bg-white">
                      {stats.bySkill.map((row) => (
                        <div key={row.label} className="flex items-center justify-between border-b border-blue-100 px-3 py-1.5 last:border-0">
                          <span className="text-xs capitalize text-slate-700">{row.label}</span>
                          <span className="text-xs font-semibold text-blue-700">{row.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-1 text-sm text-blue-500">Stats unavailable.</p>
        )}
      </section>

      {/* Passage Question Preview */}
      <PassagePreviewSection adminPassword={adminPassword} />

      {student ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Managing data for{" "}
            <span className="font-semibold text-slate-900">{student.name}</span>{" "}
            <span className="text-slate-400">({student.id})</span>
          </p>
        </div>
      ) : null}

      {/* Backup */}
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Backup Progress</h2>
        <p className="mt-1 text-sm text-slate-500">
          Download all your quiz sessions and word progress as a JSON file.
        </p>
        <button
          type="button"
          onClick={handleBackup}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Download Backup
        </button>
        {backupStatus ? (
          <p className={`mt-2 text-sm ${backupStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {backupStatus.message}
          </p>
        ) : null}
      </section>

      {/* Admin SATWords Import */}
      <section className="rounded-xl border border-amber-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Admin: Import SATWords.json</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload an updated SATWords JSON file to refresh the word bank and save it to the source
          SATWords.json file used by this project. Each word should provide sentence_1 and can optionally
          include sentence_2 through sentence_5.
        </p>
        <div className="mt-4">
          <label htmlFor="admin-import-passcode" className="block text-sm font-medium text-slate-700">
            Admin passcode
          </label>
          <input
            id="admin-import-passcode"
            type="password"
            value={importPasscode}
            onChange={(e) => {
              setImportPasscode(e.target.value);
              setPasscodeVerified(false);
              setPasscodeStatus(null);
            }}
            placeholder="Enter admin passcode"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={handleVerifyPasscode}
            disabled={verifyingPasscode || !importPasscode.trim()}
            className="rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {verifyingPasscode ? "Verifying..." : "Verify Passcode"}
          </button>
          {passcodeStatus ? (
            <p className={`mt-2 text-sm ${passcodeStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
              {passcodeStatus.message}
            </p>
          ) : null}
        </div>
        <label className="mt-4 inline-block cursor-pointer rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
          {importingWords ? "Importing…" : "Choose SATWords.json"}
          <input
            ref={wordsFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportSatWords}
            disabled={importingWords || !passcodeVerified}
            className="sr-only"
          />
        </label>
        {wordsImportStatus ? (
          <p className={`mt-2 text-sm ${wordsImportStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {wordsImportStatus.message}
          </p>
        ) : null}
      </section>

      {/* Admin Blank Question Import */}
      <section className="rounded-xl border border-amber-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Admin: Import Question_word_blanks.json</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload blank-question JSON data to refresh blank quiz prompts. Each row must include either
          sentence and blankSentence or sentence_1 and blankSentence_1, and can optionally include up to
          sentence_5 and blankSentence_5.
        </p>
        <label className="mt-4 inline-block cursor-pointer rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
          {importingBlanks ? "Importing…" : "Choose Question_word_blanks.json"}
          <input
            ref={blanksFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportBlanks}
            disabled={importingBlanks || !passcodeVerified}
            className="sr-only"
          />
        </label>
        {blanksImportStatus ? (
          <p className={`mt-2 text-sm ${blanksImportStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {blanksImportStatus.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-amber-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Admin: Import Passage Folder (q_###.json)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Import all passage files from Verbal/questions/Question_word_passages incrementally.
          Unchanged files are skipped automatically.
        </p>
        <button
          type="button"
          onClick={handleImportPassagesFromFolder}
          disabled={importingPassages || !passcodeVerified}
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {importingPassages ? "Importing…" : "Import Passage Folder"}
        </button>
        {passagesImportStatus ? (
          <p className={`mt-2 text-sm ${passagesImportStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {passagesImportStatus.message}
          </p>
        ) : null}
        {passageImportErrors.length > 0 ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-red-700">
              Failed questions ({passageImportErrors.length}){passageImportErrors.length > 20 ? " — showing first 20" : ""}:
            </p>
            <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-red-200 bg-red-50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-red-200 bg-red-100">
                    <th className="px-3 py-2 text-left font-semibold text-red-800">File</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-800">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {passageImportErrors.slice(0, 20).map((err, i) => (
                    <tr key={i} className="border-b border-red-100 last:border-0">
                      <td className="px-3 py-1.5 font-mono text-red-700">{err.file}</td>
                      <td className="px-3 py-1.5 text-red-600">{err.error}</td>
                    </tr>
                  ))}
                  {passageImportErrors.length > 20 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-1.5 text-center text-red-500">
                        …and {passageImportErrors.length - 20} more
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-amber-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Admin: Import AP CSP Questions (ap_csp/)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Import all AP CSP question files from the <span className="font-mono text-xs">ap_csp/</span> folder
          incrementally. Each JSON file must contain a <span className="font-mono text-xs">unit</span> string
          and a <span className="font-mono text-xs">questions</span> array. Existing questions are updated;
          new questions are inserted.
        </p>
        <button
          type="button"
          onClick={handleImportCspFromFolder}
          disabled={importingCsp || !passcodeVerified}
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {importingCsp ? "Importing…" : "Import AP CSP Folder"}
        </button>
        {cspImportStatus ? (
          <p className={`mt-2 text-sm ${cspImportStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {cspImportStatus.message}
          </p>
        ) : null}
        {cspImportErrors.length > 0 ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-red-700">
              Failed questions ({cspImportErrors.length}){cspImportErrors.length > 20 ? " — showing first 20" : ""}:
            </p>
            <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-red-200 bg-red-50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-red-200 bg-red-100">
                    <th className="px-3 py-2 text-left font-semibold text-red-800">File</th>
                    <th className="px-3 py-2 text-left font-semibold text-red-800">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {cspImportErrors.slice(0, 20).map((err, i) => (
                    <tr key={i} className="border-b border-red-100 last:border-0">
                      <td className="px-3 py-1.5 font-mono text-red-700">{err.file}</td>
                      <td className="px-3 py-1.5 text-red-600">{err.error}</td>
                    </tr>
                  ))}
                  {cspImportErrors.length > 20 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-1.5 text-center text-red-500">
                        …and {cspImportErrors.length - 20} more
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* Restore */}
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Restore from Backup</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a backup JSON file to restore progress. This will overwrite your current data.
        </p>
        <label className="mt-4 inline-block cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          {restoring ? "Restoring…" : "Choose Backup File"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestore}
            disabled={restoring}
            className="sr-only"
          />
        </label>
        {restoreStatus ? (
          <p className={`mt-2 text-sm ${restoreStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {restoreStatus.message}
          </p>
        ) : null}
      </section>

      {/* Clear */}
      <section className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-red-700">Clear All Progress</h2>
        <p className="mt-1 text-sm text-slate-500">
          Permanently delete all quiz sessions and word progress for this student. This cannot be undone.
        </p>
        {!showClearConfirm ? (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Clear All Progress
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm font-medium text-red-700">Are you sure? This is permanent.</p>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {clearing ? "Clearing…" : "Yes, Clear Everything"}
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
        {clearStatus ? (
          <p className={`mt-2 text-sm ${clearStatus.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {clearStatus.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
