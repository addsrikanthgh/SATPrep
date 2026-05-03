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

type QuestionEntry = {
  item: PassageItem;
  visual: PassageVisualType | null;
  visualError: string;
  selectedChoice: "A" | "B" | "C" | "D" | null;
  feedback: Feedback | null;
  flagged: boolean;
};

const defaultCount = 10;
const questionCountOptions = [5, 10, 15, 20, 25];

type FilterOptions = {
  domains: string[];
  skillsByDomain: Record<string, string[]>;
};

async function safeJson<T>(response: Response): Promise<T | null> {
  const body = await response.text();
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

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

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function RibbonIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 3h10v18l-5-3-5 3V3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M8 7h10M8 12h10M8 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

export function PassagePracticeClient() {
  const [quizStyle, setQuizStyle] = useState<"custom" | "dsat">("custom");
  const [questionCount, setQuestionCount] = useState(defaultCount);
  const [filterDomain, setFilterDomain] = useState<string>("");
  const [filterSkill, setFilterSkill] = useState<string>("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<PassageQuizSession | null>(null);
  const [questionHistory, setQuestionHistory] = useState<QuestionEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>("");
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [mobileView, setMobileView] = useState<"passage" | "question">("passage");

  const activeEntry = questionHistory[currentIndex] ?? null;
  const isDsatSession = !!session?.quizName.includes("-DSAT-");
  const answeredCount = questionHistory.filter((entry) => !!entry.selectedChoice).length;
  const flaggedCount = questionHistory.filter((entry) => entry.flagged).length;
  const isTimeExpired = timeLeftSeconds !== null && timeLeftSeconds <= 0;
  const isExamMode = !!session;

  useEffect(() => {
    fetch("/api/quiz/passages/filters")
      .then((r) => r.json())
      .then((data) => setFilterOptions(data as FilterOptions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session || done || isTimeExpired || timeLeftSeconds === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSeconds((current) => {
        if (current === null) {
          return null;
        }

        if (current <= 1) {
          window.clearInterval(timer);
          setShowTimeUpModal(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [done, isTimeExpired, session, timeLeftSeconds]);

  useEffect(() => {
    if (!isExamMode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExamMode]);

  const availableSkills = filterDomain && filterOptions ? (filterOptions.skillsByDomain[filterDomain] ?? []) : [];

  async function fetchVisualForItem(targetItem: PassageItem) {
    if (!targetItem.visualId) {
      return { visual: null, visualError: "" };
    }

    try {
      const response = await fetch(`/api/quiz/passages/visuals/${encodeURIComponent(targetItem.visualId)}`);
      const payload = await safeJson<PassageVisualType | { error?: string }>(response);

      if (!response.ok) {
        return {
          visual: null,
          visualError: (payload as { error?: string } | null)?.error ?? "Unable to load visual.",
        };
      }

      if (!payload) {
        return { visual: null, visualError: "Unable to load visual." };
      }

      return { visual: payload as PassageVisualType, visualError: "" };
    } catch {
      return { visual: null, visualError: "Unable to load visual." };
    }
  }

  async function startQuiz() {
    setLoading(true);
    setError("");
    setDone(false);
    setShowTimeUpModal(false);
    setTimerHidden(false);
    setShowQuestionGrid(false);
    setMobileView("passage");
    setQuestionHistory([]);
    setCurrentIndex(0);

    const isDsatStyle = quizStyle === "dsat";

    try {
      const startResponse = await fetch("/api/quiz/passages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionCount,
          filterDomain: filterDomain || null,
          filterSkill: filterSkill || null,
          dsatStyle: isDsatStyle,
        }),
      });

      if (!startResponse.ok) {
        const payload = await safeJson<{ error?: string }>(startResponse);
        setError(payload?.error ?? "Unable to start passage quiz.");
        setLoading(false);
        return;
      }

      const created = await safeJson<PassageQuizSession>(startResponse);
      if (!created) {
        setError("Unable to start passage quiz.");
        setLoading(false);
        return;
      }
      setSession(created);
      setTimeLeftSeconds(isDsatStyle ? 32 * 60 : created.questionCount * 60);
      await loadNextQuestion(created.id);
    } catch {
      setError("Unable to start passage quiz.");
      setLoading(false);
    }
  }

  async function loadNextQuestion(sessionId: number) {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/quiz/passages/next?passageQuizSessionId=${sessionId}`);
    const payload = (await safeJson<{
      done: boolean;
      session?: PassageQuizSession;
      item?: PassageItem;
      error?: string;
    }>(response)) ?? { done: false, error: "Unexpected server response." };

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
    } else {
      const nextItem = payload.item ?? null;
      if (nextItem) {
        const nextIndex = questionHistory.length;
        const { visual, visualError } = await fetchVisualForItem(nextItem);
        const entry: QuestionEntry = {
          item: nextItem,
          visual,
          visualError,
          selectedChoice: null,
          feedback: null,
          flagged: false,
        };
        setQuestionHistory((previous) => [...previous, entry]);
        setCurrentIndex(nextIndex);
      }
    }

    setLoading(false);
  }

  async function submitAnswer(answer: "A" | "B" | "C" | "D") {
    if (!session || !activeEntry || activeEntry.feedback || isTimeExpired || (isDsatSession && !!activeEntry.selectedChoice)) {
      return;
    }

    const response = await fetch("/api/quiz/passages/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passageQuizSessionId: session.id,
        passageSetId: activeEntry.item.passageSetId,
        questionId: activeEntry.item.questionId,
        selectedAnswer: answer,
      }),
    });

    const payload = await safeJson<{
      session: PassageQuizSession;
      feedback: Feedback;
      error?: string;
    }>(response);

    if (!payload) {
      setError(response.ok ? "Unexpected server response." : "Server error while submitting answer.");
      return;
    }

    if (!response.ok) {
      setError(payload.error ?? "Unable to submit answer.");
      return;
    }

    setQuestionHistory((previous) =>
      previous.map((entry, index) =>
        index === currentIndex
          ? {
              ...entry,
              selectedChoice: answer,
              feedback: isDsatSession ? null : payload.feedback,
            }
          : entry,
      ),
    );
    setSession(payload.session);
  }

  async function handleNext() {
    if (!session || !activeEntry || isTimeExpired) {
      return;
    }

    if (currentIndex < questionHistory.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    if (!activeEntry.feedback && !(isDsatSession && activeEntry.selectedChoice)) {
      return;
    }

    await loadNextQuestion(session.id);
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
    }
  }

  function toggleFlagForCurrent() {
    if (!activeEntry) {
      return;
    }

    setQuestionHistory((previous) =>
      previous.map((entry, index) =>
        index === currentIndex
          ? {
              ...entry,
              flagged: !entry.flagged,
            }
          : entry,
      ),
    );
  }

  async function endQuizAndReset() {
    if (!session) {
      return;
    }

    reset();
  }

  function reset() {
    setSession(null);
    setQuizStyle("custom");
    setQuestionHistory([]);
    setCurrentIndex(0);
    setDone(false);
    setError("");
    setFilterDomain("");
    setFilterSkill("");
    setTimeLeftSeconds(null);
    setShowTimeUpModal(false);
    setTimerHidden(false);
    setShowQuestionGrid(false);
    setMobileView("passage");
  }

  const timerClassName =
    timeLeftSeconds !== null && timeLeftSeconds <= 60
      ? "text-red-700 animate-pulse"
      : timeLeftSeconds !== null && timeLeftSeconds <= 300
        ? "text-amber-700"
        : "text-slate-900";

  return (
    <div
      className={
        isExamMode
          ? "fixed inset-0 z-[70] overflow-hidden bg-[#f7f7f7] px-2 py-2 sm:px-3 sm:py-3"
          : "space-y-5"
      }
    >
      {!session ? (
        <SurfaceCard className="border-slate-300 bg-[#fcfcfd] shadow-none sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Start DSAT Passage Practice</h2>
          <p className="mt-2 text-sm text-slate-600">
            Configure your section and begin a timed, test-style passage session.
          </p>

          <label className="mt-4 block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Quiz style</span>
            <select
              value={quizStyle}
              onChange={(event) => {
                const nextStyle = event.target.value as "custom" | "dsat";
                setQuizStyle(nextStyle);
                if (nextStyle === "dsat") {
                  setFilterDomain("");
                  setFilterSkill("");
                  setQuestionCount(27);
                }
              }}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
            >
              <option value="custom">Custom Practice</option>
              <option value="dsat">DSAT Style (27 questions, 32 minutes)</option>
            </select>
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-700">
              <span className="mb-2 block font-medium">Domain</span>
              <select
                value={filterDomain}
                onChange={(e) => {
                  setFilterDomain(e.target.value);
                  setFilterSkill("");
                }}
                disabled={quizStyle === "dsat"}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
              >
                <option value="">All domains (random)</option>
                {(filterOptions?.domains ?? []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-2 block font-medium">Skill</span>
              <select
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                disabled={!filterDomain || quizStyle === "dsat"}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 disabled:opacity-50"
              >
                <option value="">All skills</option>
                {availableSkills.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm text-slate-700">
            <span className="mb-2 block font-medium">Question count</span>
            <select
              value={questionCount}
              disabled={quizStyle === "dsat"}
              onChange={(event) => setQuestionCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
            >
              {questionCountOptions.map((count) => (
                <option key={count} value={count}>
                  {count} questions ({count} minutes)
                </option>
              ))}
              {quizStyle === "dsat" ? (
                <option value={27}>27 questions (32 minutes)</option>
              ) : null}
            </select>
          </label>

          <button
            type="button"
            onClick={startQuiz}
            disabled={loading}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{loading ? "Starting..." : "Start Timed Section"}</span>
            {!loading ? <ArrowRightIcon /> : null}
          </button>

          {filterDomain || filterSkill ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <CheckIcon />
              Filtered: {[filterDomain, filterSkill].filter(Boolean).join(" › ")}
            </p>
          ) : null}

          {quizStyle === "dsat" ? (
            <p className="mt-2 text-xs text-slate-600">
              DSAT style uses a fixed 27-question mixed-domain set with a 32-minute timer.
            </p>
          ) : null}
        </SurfaceCard>
      ) : null}

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {session && !done ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[80] -translate-x-1/2">
          {!timerHidden ? (
            <div className={`text-center font-mono text-3xl font-extrabold ${timerClassName}`}>
              {timeLeftSeconds === null ? "--:--" : formatTime(timeLeftSeconds)}
            </div>
          ) : null}
          <div className="pointer-events-auto mt-1.5 flex justify-center">
            <button
              type="button"
              onClick={() => setTimerHidden((hidden) => !hidden)}
              className="rounded bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              {timerHidden ? "Show Timer" : "Hide Timer"}
            </button>
          </div>
        </div>
      ) : null}

      {session ? (
        <SurfaceCard className="border-slate-300 bg-white p-2.5 shadow-none sm:p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-700">
            <span className="w-fit rounded-sm border border-slate-300 bg-slate-50 px-2 py-1 font-medium">{session.quizName}</span>
            {isDsatSession ? null : (
              <span>
                Score: {session.correctCount} / {session.answeredCount}
              </span>
            )}
            <span>
              Answered: {answeredCount} / {session.questionCount}
            </span>
            <span className="text-slate-500">Flagged: {flaggedCount}</span>

            <button
              type="button"
              onClick={reset}
              className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              End Quiz
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      {session && activeEntry ? (
        <div className="mt-1.5 grid min-h-0 gap-2 pb-20 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:pb-24">
          <SurfaceCard
            className={`min-w-0 border-slate-300 bg-[#f7f7f7] p-0 shadow-none ${mobileView === "question" ? "hidden lg:block" : "block"}`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-300 bg-[#f7f7f7] px-4 py-3 sm:px-5">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Reading Passage</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{activeEntry.item.passageSetId}</p>
              </div>
            </div>

            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto px-4 py-3 sm:max-h-[calc(100vh-21rem)] sm:px-5 sm:py-4 lg:max-h-[calc(100vh-20rem)]">
              {activeEntry.item.passage ? (
                <article className="text-[1.02rem] leading-8 text-slate-900" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
                  {renderPassage(activeEntry.item.passage)}
                </article>
              ) : (
                <article className="text-sm leading-7 text-slate-500">Passage hidden (already read once).</article>
              )}

              {activeEntry.visual ? <div className="mt-5"><PassageVisual visual={activeEntry.visual} /></div> : null}
              {activeEntry.visualError ? (
                <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {activeEntry.visualError}
                </div>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard
            className={`min-w-0 border-slate-300 bg-white p-0 shadow-none ${mobileView === "passage" ? "hidden lg:block" : "block"}`}
          >
            <div className="border-b border-slate-300 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-start gap-2">
                <span className="inline-flex h-8 min-w-8 items-center justify-center bg-black px-2 text-sm font-bold text-white">
                  {currentIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={toggleFlagForCurrent}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    activeEntry.flagged
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <RibbonIcon filled={activeEntry.flagged} />
                  {activeEntry.flagged ? "Reviewed" : "Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestionGrid(true)}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <ListIcon />
                  Jump to Question
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto px-4 py-3 sm:max-h-[calc(100vh-21rem)] sm:px-5 sm:py-4 lg:max-h-[calc(100vh-20rem)]">
              <h3 className="text-base font-semibold leading-7 text-slate-900">{activeEntry.item.question}</h3>

              <div className="mt-4 grid gap-2.5">
                {(["A", "B", "C", "D"] as const).map((choice) => {
                  const isSelected = activeEntry.selectedChoice === choice;
                  const isCorrect = activeEntry.feedback?.correctAnswer === choice;
                  const isWrongSelection = activeEntry.feedback && isSelected && !activeEntry.feedback.isCorrect;

                  const className = activeEntry.feedback
                    ? isCorrect
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : isWrongSelection
                        ? "border-red-400 bg-red-50 text-red-900"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    : isSelected
                      ? "border-slate-900 bg-slate-100 text-slate-900"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";

                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={!!activeEntry.feedback || loading || isTimeExpired || (isDsatSession && !!activeEntry.selectedChoice)}
                      onClick={() => submitAnswer(choice)}
                      className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${className}`}
                    >
                      <span className="font-semibold">{choice}.</span> {activeEntry.item.choices[choice]}
                    </button>
                  );
                })}
              </div>

              {activeEntry.feedback ? (
                <div className="mt-5 rounded-md border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
                  <p
                    className={
                      activeEntry.feedback.isCorrect
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-red-700"
                    }
                  >
                    {activeEntry.feedback.isCorrect
                      ? "Correct."
                      : `Incorrect. Correct answer: ${activeEntry.feedback.correctAnswer}`}
                  </p>
                  <p className="mt-2 leading-6 text-slate-700">{activeEntry.feedback.explanation}</p>
                </div>
              ) : null}
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {session && done ? (
        <SurfaceCard className="border-emerald-200 bg-emerald-50 text-sm text-emerald-900 shadow-none">
          <p className="font-semibold">Passage quiz complete.</p>
          <p className="mt-1">
            Final score: {session.correctCount} / {session.answeredCount}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            Start Another Passage Quiz
          </button>
        </SurfaceCard>
      ) : null}

      {session && activeEntry ? (
        <div className="fixed inset-x-0 bottom-3 z-30 px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView((view) => (view === "passage" ? "question" : "passage"))}
            className="w-full rounded-md border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            {mobileView === "passage" ? "View Question" : "View Passage"}
          </button>
        </div>
      ) : null}

      {session && activeEntry && !done ? (
        <div className="fixed bottom-3 right-4 z-[75] hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={
              isTimeExpired ||
              loading ||
              done ||
              (currentIndex === questionHistory.length - 1 && !activeEntry.feedback && !(isDsatSession && activeEntry.selectedChoice))
            }
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}

      {session && activeEntry && !done ? (
        <div className="fixed bottom-3 left-4 z-[75] hidden items-center gap-2 lg:flex">
          <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{activeEntry.item.domain}</span>
          <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{activeEntry.item.skill}</span>
          <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{activeEntry.item.difficulty}</span>
        </div>
      ) : null}

      {session && activeEntry && !done ? (
        <div className="fixed bottom-3 left-1/2 z-[75] hidden -translate-x-1/2 lg:block">
          <div className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white">
            Question {currentIndex + 1}/{session.questionCount}
          </div>
        </div>
      ) : null}

      {showQuestionGrid && session ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl rounded-lg border border-slate-300 bg-white p-4 shadow-lg sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Question Navigator</h3>
              <button
                type="button"
                onClick={() => setShowQuestionGrid(false)}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {Array.from({ length: session.questionCount }).map((_, idx) => {
                const entry = questionHistory[idx];
                const isActive = idx === currentIndex;

                const statusClass = !entry
                  ? "border-slate-200 bg-white text-slate-400"
                  : entry.flagged
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : entry.selectedChoice
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-blue-300 bg-blue-50 text-blue-800";

                return (
                  <button
                    key={`grid-${idx + 1}`}
                    type="button"
                    disabled={!entry}
                    onClick={() => {
                      if (!entry) {
                        return;
                      }
                      setCurrentIndex(idx);
                      setShowQuestionGrid(false);
                    }}
                    className={`rounded-md border px-2 py-2 text-xs font-semibold ${statusClass} ${
                      isActive ? "ring-2 ring-slate-900" : ""
                    } disabled:cursor-not-allowed`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Answered</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Current / Unsubmitted</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Flagged</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Not yet loaded</span>
            </div>
          </div>
        </div>
      ) : null}

      {showTimeUpModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-5 text-center shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">Time&apos;s up</h3>
            <p className="mt-2 text-sm text-slate-600">
              Time has expired for this section. Answer selection is now locked.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowTimeUpModal(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={() => void endQuizAndReset()}
                className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                End Section
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
