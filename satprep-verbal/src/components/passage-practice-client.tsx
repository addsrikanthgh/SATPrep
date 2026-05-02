"use client";

import { useState, useEffect } from "react";
import { SurfaceCard } from "@/components/ui/surface-card";
import { PassageVisual } from "@/components/passage-visual";
import type { PassageVisualData as PassageVisualType } from "@/components/passage-visual";

type PassageQuizSession = {
  id: number;
  quizNumber: number;
  quizName: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  status: string;
};

type PassageItem = {
  passageSetId: string;
  domain: string;
  skill: string;
  difficulty: string;
  questionId: string;
  questionType: string;
  visualId: string | null;
  question: string;
  choices: Record<"A" | "B" | "C" | "D", string>;
  passage: string | null;
  alreadyRead: boolean;
  readPolicy: string;
};

type Feedback = {
  isCorrect: boolean;
  selectedAnswer: "A" | "B" | "C" | "D";
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
};

const defaultCount = 10;
const questionCountOptions = [5, 10, 15, 20, 25];

type FilterOptions = {
  domains: string[];
  skillsByDomain: Record<string, string[]>;
};

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 7l6 5-6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12.5l4 4L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Splits passage text on *...* markers and renders the enclosed span as underlined. */
function renderPassage(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return <span key={i} className="underline decoration-slate-700 underline-offset-2">{part.slice(1, -1)}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function PassagePracticeClient() {
  const [questionCount, setQuestionCount] = useState(defaultCount);
  const [filterDomain, setFilterDomain] = useState<string>("");
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<PassageQuizSession | null>(null);
  const [item, setItem] = useState<PassageItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>("");
  const [visualError, setVisualError] = useState<string>("");
  const [visual, setVisual] = useState<PassageVisualType | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<"A" | "B" | "C" | "D" | null>(null);

  useEffect(() => {
    fetch("/api/quiz/passages/filters")
      .then((r) => r.json())
      .then((data) => setFilterOptions(data as FilterOptions))
      .catch(() => {});
  }, []);

  const availableSkills = filterDomain && filterOptions ? (filterOptions.skillsByDomain[filterDomain] ?? []) : [];

  async function startQuiz() {
    setLoading(true);
    setError("");
    setDone(false);
    setFeedback(null);
    setSelectedChoice(null);
    setVisual(null);
    setVisualError("");

    try {
      const startResponse = await fetch("/api/quiz/passages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionCount,
          filterDomain: filterDomain || null,
          filterSkill: filterSkill || null,
        }),
      });

      if (!startResponse.ok) {
        const payload = (await startResponse.json()) as { error?: string };
        setError(payload.error ?? "Unable to start passage quiz.");
        setLoading(false);
        return;
      }

      const created = (await startResponse.json()) as PassageQuizSession;
      setSession(created);
      await loadNextQuestion(created.id);
    } catch {
      setError("Unable to start passage quiz.");
      setLoading(false);
    }
  }

  async function loadNextQuestion(sessionId: number) {
    setLoading(true);
    setFeedback(null);
    setSelectedChoice(null);

    const response = await fetch(`/api/quiz/passages/next?passageQuizSessionId=${sessionId}`);
    const payload = (await response.json()) as {
      done: boolean;
      session?: PassageQuizSession;
      item?: PassageItem;
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Unable to load next passage question.");
      setLoading(false);
      return;
    }

    if (payload.session) {
      setSession(payload.session);
    }

    if (payload.done) {
      setDone(true);
      setItem(null);
      setVisual(null);
      setVisualError("");
    } else {
      setItem(payload.item ?? null);
    }

    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchVisual() {
      if (!item?.visualId) {
        setVisual(null);
        setVisualError("");
        return;
      }

      try {
        setVisualError("");
        const response = await fetch(`/api/quiz/passages/visuals/${encodeURIComponent(item.visualId)}`);
        const payload = (await response.json()) as PassageVisualType | { error?: string };

        if (!response.ok) {
          if (!cancelled) {
            setVisual(null);
            setVisualError((payload as { error?: string }).error ?? "Unable to load visual.");
          }
          return;
        }

        if (!cancelled) {
          setVisual(payload as PassageVisualType);
        }
      } catch {
        if (!cancelled) {
          setVisual(null);
          setVisualError("Unable to load visual.");
        }
      }
    }

    void fetchVisual();

    return () => {
      cancelled = true;
    };
  }, [item?.visualId]);

  async function submitAnswer(answer: "A" | "B" | "C" | "D") {
    if (!session || !item || feedback) {
      return;
    }

    const response = await fetch("/api/quiz/passages/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passageQuizSessionId: session.id,
        passageSetId: item.passageSetId,
        questionId: item.questionId,
        selectedAnswer: answer,
      }),
    });

    const payload = (await response.json()) as {
      session: PassageQuizSession;
      feedback: Feedback;
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Unable to submit answer.");
      return;
    }

    setSelectedChoice(answer);
    setSession(payload.session);
    setFeedback(payload.feedback);
  }

  async function nextQuestion() {
    if (!session) {
      return;
    }

    await loadNextQuestion(session.id);
  }

  function reset() {
    setSession(null);
    setItem(null);
    setFeedback(null);
    setDone(false);
    setError("");
    setSelectedChoice(null);
    setFilterDomain("");
    setFilterSkill("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          {!session ? (
            <SurfaceCard>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Start Passage Quiz</h2>
              <p className="mt-2 text-sm text-slate-600">
                Choose a domain and skill to focus on, or leave blank for a mixed quiz across all categories.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Domain</span>
                  <select
                    value={filterDomain}
                    onChange={(e) => { setFilterDomain(e.target.value); setFilterSkill(""); }}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">All domains (random)</option>
                    {(filterOptions?.domains ?? []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Skill</span>
                  <select
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    disabled={!filterDomain}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                  >
                    <option value="">All skills</option>
                    {availableSkills.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Question count</span>
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {questionCountOptions.map((count) => (
                    <option key={count} value={count}>
                      {count} questions
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={startQuiz}
                disabled={loading}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{loading ? "Starting..." : "Start Passage Quiz"}</span>
                {!loading ? <ArrowRightIcon /> : null}
              </button>

              {filterDomain || filterSkill ? (
                <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                  <CheckIcon />
                  Filtered: {[filterDomain, filterSkill].filter(Boolean).join(" › ")}
                </p>
              ) : null}
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckIcon />
                Read-once policy and progress tracking are applied automatically.
              </p>
            </SurfaceCard>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}

          {session ? (
            <SurfaceCard className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
                  {session.quizName}
                </span>
                <span>
                  Score: {session.correctCount} / {session.answeredCount}
                </span>
                <span>
                  Target: {session.questionCount}
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100"
                >
                  End Quiz
                </button>
              </div>
            </SurfaceCard>
          ) : null}

          {session && item ? (
            <SurfaceCard>
              <div className="mb-2">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-500">{item.passageSetId}</span>
              </div>
              {item.passage ? (
                <article className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 sm:p-5">
                  {renderPassage(item.passage)}
                </article>
              ) : (
                <article className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500 sm:p-5">
                  Passage hidden (already read once).
                </article>
              )}

              {visual ? <PassageVisual visual={visual} /> : null}
              {visualError ? (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {visualError}
                </div>
              ) : null}

              <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>

              <div className="mt-4 grid gap-3">
                {(["A", "B", "C", "D"] as const).map((choice) => {
                  const isSelected = selectedChoice === choice;
                  const isCorrect = feedback?.correctAnswer === choice;
                  const isWrongSelection = feedback && isSelected && !feedback.isCorrect;

                  const className = feedback
                    ? isCorrect
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : isWrongSelection
                        ? "border-red-400 bg-red-50 text-red-900"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50";

                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={!!feedback || loading}
                      onClick={() => submitAnswer(choice)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition-all duration-150 ${className}`}
                    >
                      <span className="font-semibold">{choice}.</span> {item.choices[choice]}
                    </button>
                  );
                })}
              </div>

              {feedback ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                  <p className={feedback.isCorrect ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {feedback.isCorrect ? "Correct." : `Incorrect. Correct answer: ${feedback.correctAnswer}`}
                  </p>
                  <p className="mt-2 text-slate-700">{feedback.explanation}</p>
                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:shadow-md"
                  >
                    Next Question
                  </button>
                </div>
              ) : null}
            </SurfaceCard>
          ) : null}

          {session && done ? (
            <SurfaceCard className="border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
              <p className="font-semibold">Passage quiz complete.</p>
              <p className="mt-1">
                Final score: {session.correctCount} / {session.answeredCount}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition-all duration-150 hover:bg-emerald-100"
              >
                Start Another Passage Quiz
              </button>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
