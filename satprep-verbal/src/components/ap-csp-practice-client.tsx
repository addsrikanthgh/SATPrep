"use client";

import { useEffect, useMemo, useState } from "react";
import { SurfaceCard } from "@/components/ui/surface-card";

type CspQuestion = {
  id: string;
  unit: string;
  stem: string;
  choices: string[];
  difficulty?: string | null;
};

type CspSession = {
  id: number;
  startedAt: string;
  completedAt: string | null;
  score: number;
  totalQuestions: number;
  unitFilter: string | null;
  immediateFeedback: boolean;
  timeLimitSeconds: number | null;
};

type SubmitResult = {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  correctAnswerIndex: number;
  explanation: string;
  stem: string;
  choices: string[];
};

type SubmitResponse = {
  result: SubmitResult;
  session: CspSession & {
    answeredCount: number;
    remainingCount: number;
    completed: boolean;
  };
};

type CspUnitOption = {
  value: string;
  label: string;
  availableQuestions: number;
};

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ApCspPracticeClient() {
  const [unit, setUnit] = useState("all");
  const [questionCount, setQuestionCount] = useState(10);
  const [immediateFeedback, setImmediateFeedback] = useState(true);
  const [timedMode, setTimedMode] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(20);
  const [unitOptions, setUnitOptions] = useState<CspUnitOption[]>([]);
  const [totalAvailableQuestions, setTotalAvailableQuestions] = useState(0);

  const [session, setSession] = useState<CspSession | null>(null);
  const [questions, setQuestions] = useState<CspQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<SubmitResult | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Record<string, SubmitResult>>({});
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  const currentQuestion = questions[index] ?? null;
  const completedCount = Object.keys(answeredMap).length;
  const quizCompleted = completedCount >= questions.length;
  const isExamMode = !!session;
  const selectedUnitCount = unit === "all"
    ? totalAvailableQuestions
    : (unitOptions.find((option) => option.value === unit)?.availableQuestions ?? 0);
  const timerClassName =
    timeLeftSeconds !== null && timeLeftSeconds <= 60
      ? "text-red-700 animate-pulse"
      : timeLeftSeconds !== null && timeLeftSeconds <= 300
        ? "text-amber-700"
        : "text-slate-900";

  const incorrectFromCurrentQuiz = useMemo(() => {
    return Object.values(answeredMap).filter((item) => !item.isCorrect);
  }, [answeredMap]);

  useEffect(() => {
    async function loadUnits() {
      try {
        const response = await fetch("/api/csp/units");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          units: CspUnitOption[];
          totalQuestions: number;
        };

        setUnitOptions(payload.units);
        setTotalAvailableQuestions(payload.totalQuestions);
      } catch {
        // Keep the form usable even if unit metadata fails to load.
      }
    }

    void loadUnits();
  }, []);

  useEffect(() => {
    if (selectedUnitCount > 0 && questionCount > selectedUnitCount) {
      setQuestionCount(selectedUnitCount);
    }
  }, [questionCount, selectedUnitCount]);

  useEffect(() => {
    if (!session || quizCompleted || timeLeftSeconds === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSeconds((current) => {
        if (current === null) {
          return null;
        }
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [quizCompleted, session, timeLeftSeconds]);

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

  useEffect(() => {
    if (!session || timeLeftSeconds !== 0 || quizCompleted) {
      return;
    }

    const unansweredIndex = questions.findIndex((question) => !answeredMap[question.id]);
    if (unansweredIndex !== -1) {
      setIndex(unansweredIndex);
    }
  }, [answeredMap, questions, quizCompleted, session, timeLeftSeconds]);

  function canAnswerCurrentQuestion() {
    return !answeredMap[currentQuestion?.id ?? ""] && (timeLeftSeconds === null || timeLeftSeconds > 0);
  }

  async function startQuiz() {
    setLoading(true);
    setError("");
    setFeedback(null);
    setAnsweredMap({});
    setQuestions([]);
    setSession(null);
    setIndex(0);
    setTimeLeftSeconds(null);
    setShowQuestionGrid(false);

    try {
      const response = await fetch("/api/csp/quiz/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit,
          questionCount,
          immediateFeedback,
          timeLimitSeconds: timedMode ? timeMinutes * 60 : null,
        }),
      });

      const payload = (await response.json()) as {
        session?: CspSession;
        questions?: CspQuestion[];
        error?: string;
      };

      if (!response.ok || !payload.session || !payload.questions) {
        setError(payload.error ?? "Failed to start AP CSP quiz.");
        setLoading(false);
        return;
      }

      setSession(payload.session);
      setQuestions(payload.questions);
      setIndex(0);
      setTimeLeftSeconds(payload.session.timeLimitSeconds ?? null);
    } catch {
      setError("Failed to start AP CSP quiz.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(selectedAnswer: number) {
    if (!session || !currentQuestion || submitting || answeredMap[currentQuestion.id]) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/csp/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: currentQuestion.id,
          selectedAnswer,
        }),
      });

      const payload = (await response.json()) as SubmitResponse | { error?: string };
      if (!response.ok || !("result" in payload)) {
        setError((payload as { error?: string }).error ?? "Failed to submit answer.");
        setSubmitting(false);
        return;
      }

      setAnsweredMap((previous) => ({
        ...previous,
        [payload.result.questionId]: payload.result,
      }));

      setSession((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          score: payload.session.score,
          completedAt: payload.session.completed ? previous.completedAt ?? new Date().toISOString() : previous.completedAt,
        };
      });

      setFeedback(payload.result);

      if (!immediateFeedback && index < questions.length - 1) {
        setIndex((value) => value + 1);
        setFeedback(null);
      }
    } catch {
      setError("Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (index >= questions.length - 1) {
      return;
    }
    setIndex((value) => value + 1);
    setFeedback(null);
  }

  function resetQuiz() {
    setSession(null);
    setQuestions([]);
    setIndex(0);
    setFeedback(null);
    setAnsweredMap({});
    setShowQuestionGrid(false);
    setTimeLeftSeconds(null);
  }

  return (
    <div className={isExamMode ? "fixed inset-0 z-[70] overflow-hidden bg-[#f7f7f7] px-2 py-2 sm:px-3 sm:py-3" : "space-y-5"}>
      {!session ? (
      <SurfaceCard className="border-slate-300 bg-[#fcfcfd] shadow-none sm:p-7">
        <h2 className="text-lg font-semibold text-slate-900">AP CSP Prep</h2>
        <p className="mt-1 text-sm text-slate-600">Configure your section and begin a timed, test-style AP CSP practice session.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            Unit
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All Units ({totalAvailableQuestions || "..."})</option>
              {unitOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>{entry.label} ({entry.availableQuestions})</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Questions
            <input
              type="number"
              min={1}
              max={Math.max(1, Math.min(60, selectedUnitCount || 60))}
              value={questionCount}
              onChange={(event) => setQuestionCount(Math.max(1, Math.min(Math.max(1, Math.min(60, selectedUnitCount || 60)), Number(event.target.value) || 10)))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">
              {selectedUnitCount > 0
                ? `${selectedUnitCount} questions available for this selection`
                : "Loading available question count..."}
            </span>
          </label>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={immediateFeedback}
              onChange={(event) => setImmediateFeedback(event.target.checked)}
            />
            Immediate feedback
          </label>

          <div className="space-y-2 rounded-md border border-slate-200 px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={timedMode}
                onChange={(event) => setTimedMode(event.target.checked)}
              />
              Timed quiz
            </label>
            <input
              type="number"
              min={1}
              max={120}
              disabled={!timedMode}
              value={timeMinutes}
              onChange={(event) => setTimeMinutes(Math.max(1, Math.min(120, Number(event.target.value) || 20)))}
              className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void startQuiz()}
            disabled={loading}
            className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Starting..." : "Start Quiz"}
          </button>
          {session ? (
            <button
              type="button"
              onClick={resetQuiz}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      </SurfaceCard>
      ) : null}

      {session ? (
        <SurfaceCard className="border-slate-300 bg-white p-2.5 shadow-none sm:p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-700">
            <span className="w-fit rounded-sm border border-slate-300 bg-slate-50 px-2 py-1 font-medium">
              AP CSP Quiz
            </span>
            <span>Score: {session.score} / {questions.length}</span>
            <span>Answered: {completedCount} / {questions.length}</span>
            {timeLeftSeconds !== null ? <span className="font-mono">Time: {formatTime(timeLeftSeconds)}</span> : null}

            <button
              type="button"
              onClick={() => setShowQuestionGrid((current) => !current)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {showQuestionGrid ? "Hide Navigator" : "Show Navigator"}
            </button>

            <button
              type="button"
              onClick={resetQuiz}
              className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              End Quiz
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      {session && !quizCompleted && timeLeftSeconds !== null ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-md border border-slate-200 bg-white/95 px-4 py-1.5 shadow-sm">
          <p className={`text-center font-mono text-2xl font-bold ${timerClassName}`}>
            {formatTime(timeLeftSeconds)}
          </p>
        </div>
      ) : null}

      {session && currentQuestion ? (
        <div
          className={`mt-1.5 grid min-h-0 gap-2 pb-20 lg:pb-24 ${
            showQuestionGrid
              ? "lg:grid-cols-[minmax(0,68fr)_minmax(0,32fr)]"
              : "lg:grid-cols-1"
          }`}
        >
          <SurfaceCard className="min-w-0 border-slate-300 bg-white p-5 shadow-none">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Question {index + 1} / {questions.length}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Unit: {currentQuestion.unit}</span>
              {currentQuestion.difficulty ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Difficulty: {currentQuestion.difficulty}</span>
              ) : null}
            </div>

            <h3 className="mt-3 text-base font-semibold text-slate-900">{currentQuestion.stem}</h3>

            <div className="mt-4 grid gap-2">
              {currentQuestion.choices.map((choice, idx) => {
                const submitted = answeredMap[currentQuestion.id];
                const isSelected = submitted?.selectedAnswer === idx;
                const isCorrect = submitted?.correctAnswerIndex === idx;

                let className = "border-slate-200 bg-white text-slate-800";
                if (submitted) {
                  if (isCorrect) className = "border-emerald-300 bg-emerald-50 text-emerald-900";
                  else if (isSelected) className = "border-red-300 bg-red-50 text-red-900";
                }

                return (
                  <button
                    key={`${currentQuestion.id}-${idx}`}
                    type="button"
                    disabled={submitting || !canAnswerCurrentQuestion() || Boolean(submitted)}
                    onClick={() => void submitAnswer(idx)}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${className} disabled:cursor-not-allowed`}
                  >
                    <span className="font-semibold">{String.fromCharCode(65 + idx)}.</span> {choice}
                  </button>
                );
              })}
            </div>

            {immediateFeedback && feedback && feedback.questionId === currentQuestion.id ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className={`text-sm font-semibold ${feedback.isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                  {feedback.isCorrect ? "Correct" : "Incorrect"}
                </p>
                <p className="mt-1 text-sm text-slate-700">{feedback.explanation}</p>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">Answered: {completedCount} / {questions.length}</p>
              <button
                type="button"
                onClick={nextQuestion}
                disabled={index >= questions.length - 1 || !answeredMap[currentQuestion.id]}
                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard className={`border-slate-300 bg-white p-4 shadow-none ${showQuestionGrid ? "block" : "hidden"}`}>
            <h3 className="text-sm font-semibold text-slate-900">Question Navigator</h3>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {questions.map((question, questionIndex) => {
                const answered = Boolean(answeredMap[question.id]);
                const active = questionIndex === index;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setIndex(questionIndex);
                      setFeedback(null);
                    }}
                    className={`h-9 rounded-md border text-xs font-semibold ${
                      active
                        ? "border-slate-800 bg-slate-800 text-white"
                        : answered
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {session && quizCompleted ? (
        <SurfaceCard className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quiz Complete</h2>
          <p className="mt-1 text-sm text-slate-700">Final score: {session.score} / {questions.length}</p>

          <div className="mt-3 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Review Incorrect Answers</h3>
            {incorrectFromCurrentQuiz.length === 0 ? (
              <p className="text-sm text-emerald-700">Perfect run. No incorrect answers.</p>
            ) : (
              incorrectFromCurrentQuiz.map((item) => (
                <div key={item.questionId} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{item.stem}</p>
                  <p className="mt-1 text-sm text-slate-700">Selected: {item.choices[item.selectedAnswer]}</p>
                  <p className="text-sm text-slate-700">Correct: {item.choices[item.correctAnswerIndex]}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.explanation}</p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
