"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PassageQuestion = {
  questionId: string;
  questionType: string;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: string;
  explanation: string;
};

type PassageRow = {
  id: string;
  domain: string;
  skill: string;
  difficulty: string;
  passage: string;
  questions: PassageQuestion[];
};

type ApiResponse = {
  total: number;
  page: number;
  pageSize: number;
  rows: PassageRow[];
};

const CHOICES = ["A", "B", "C", "D"] as const;
const DOMAINS = [
  "Information and Ideas",
  "Craft and Structure",
  "Expression of Ideas",
  "Standard English Conventions",
];
const SKILLS = [
  "central idea",
  "inference",
  "command of evidence (textual)",
  "command of evidence (quantitative)",
  "vocabulary in context",
  "function of a sentence",
  "text structure and purpose",
  "cross-text connections",
  "transitions",
  "rhetorical synthesis",
  "sentence boundaries",
  "punctuation",
  "grammar and usage",
];

function renderPassage(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <span key={i} className="underline decoration-slate-700 underline-offset-2">
              {part.slice(1, -1)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function difficultyBadge(d: string) {
  const color =
    d === "hard"
      ? "bg-red-100 text-red-700"
      : d === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>{d}</span>
  );
}

interface Props {
  adminPassword: string;
}

export function PassagePreviewSection({ adminPassword }: Props) {
  const [domain, setDomain] = useState("");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedPassage, setSelectedPassage] = useState<PassageRow | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<PassageQuestion | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchPassages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (domain) params.set("domain", domain);
      if (skill) params.set("skill", skill);
      if (difficulty) params.set("difficulty", difficulty);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/passages?${params.toString()}`, {
        headers: { "x-admin-passcode": adminPassword },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.status.toString());
        setError(`Failed to load passages: ${txt}`);
        return;
      }
      const data = (await res.json()) as ApiResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [adminPassword, domain, skill, difficulty, debouncedSearch, page]);

  useEffect(() => {
    void fetchPassages();
  }, [fetchPassages]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [domain, skill, difficulty, debouncedSearch]);

  function selectPassage(row: PassageRow) {
    setSelectedPassage(row);
    setSelectedQuestion(row.questions[0] ?? null);
    setRevealedAnswer(null);
  }

  function selectQuestion(q: PassageQuestion) {
    setSelectedQuestion(q);
    setRevealedAnswer(null);
  }

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 1;

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Passage Question Preview</h2>
      <p className="mt-1 text-sm text-slate-500">
        Browse and preview passage questions exactly as students see them.
      </p>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search by ID or text…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 lg:col-span-2"
        />
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        >
          <option value="">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm capitalize text-slate-700 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        >
          <option value="">All skills</option>
          {SKILLS.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Results count */}
      <p className="mt-3 text-xs text-slate-500">
        {loading
          ? "Loading…"
          : error
            ? <span className="text-red-600">{error}</span>
            : result
              ? `${result.total.toLocaleString()} passage${result.total !== 1 ? "s" : ""} found`
              : null}
      </p>

      {/* Two-column layout: list + preview */}
      <div className="mt-3 flex flex-col gap-4 lg:flex-row">
        {/* Passage list */}
        <div className="flex flex-col lg:w-64 lg:shrink-0">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {!loading && result && result.rows.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No passages match the filters.</p>
            ) : (
              <ul className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                {(result?.rows ?? []).map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectPassage(row)}
                      className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                        selectedPassage?.id === row.id ? "bg-violet-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">{row.id}</span>
                        {difficultyBadge(row.difficulty)}
                      </div>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">{row.skill}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {result && totalPages > 1 ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          ) : null}
        </div>

        {/* Preview pane */}
        {selectedPassage ? (
          <div className="min-w-0 flex-1">
            {/* Passage metadata */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{selectedPassage.id}</span>
              <span className="text-slate-300">·</span>
              <span>{selectedPassage.domain}</span>
              <span className="text-slate-300">·</span>
              <span className="capitalize">{selectedPassage.skill}</span>
              <span className="text-slate-300">·</span>
              {difficultyBadge(selectedPassage.difficulty)}
            </div>

            {/* Passage text */}
            <article className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
              {renderPassage(selectedPassage.passage)}
            </article>

            {/* Question tabs (if multiple) */}
            {selectedPassage.questions.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedPassage.questions.map((q) => (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => selectQuestion(q)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedQuestion?.questionId === q.questionId
                        ? "border-violet-500 bg-violet-100 text-violet-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {q.questionId}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedPassage.questions.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No questions stored for this passage.</p>
            ) : null}

            {/* Question preview */}
            {selectedQuestion ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{selectedQuestion.questionText}</h3>

                <div className="mt-3 grid gap-2">
                  {CHOICES.map((letter) => {
                    const text = selectedQuestion[`choice${letter}` as keyof PassageQuestion] as string;
                    const isCorrect = selectedQuestion.correctAnswer === letter;
                    const isRevealed = revealedAnswer !== null;

                    const base = "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors";
                    const style = isRevealed
                      ? isCorrect
                        ? `${base} border-emerald-500 bg-emerald-50 text-emerald-900`
                        : `${base} border-slate-200 bg-slate-50 text-slate-400`
                      : `${base} border-slate-200 bg-white text-slate-800`;

                    return (
                      <div key={letter} className={style}>
                        <span className={`mt-0.5 shrink-0 text-xs font-bold ${isRevealed && isCorrect ? "text-emerald-700" : "text-slate-500"}`}>
                          {letter}
                        </span>
                        <span>{text}</span>
                        {isRevealed && isCorrect ? (
                          <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-700">✓ Correct</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Reveal / explanation */}
                {revealedAnswer === null ? (
                  <button
                    type="button"
                    onClick={() => setRevealedAnswer(selectedQuestion.correctAnswer)}
                    className="mt-4 rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Explanation</p>
                    <p className="leading-6">{selectedQuestion.explanation}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-sm text-slate-400">
            Select a passage from the list to preview it.
          </div>
        )}
      </div>
    </section>
  );
}
