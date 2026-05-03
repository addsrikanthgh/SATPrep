"use client";

import { useEffect, useState } from "react";

type ProgressPayload = {
  summary: {
    totalSessions: number;
    completedSessions: number;
    totalScore: number;
    totalQuestions: number;
    overallAccuracy: number;
  };
  byUnit: Array<{
    unit: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }>;
  sessions: Array<{
    id: number;
    startedAt: string;
    completedAt: string | null;
    score: number;
    totalQuestions: number;
    unitFilter: string | null;
    immediateFeedback: boolean;
  }>;
  incorrectAnswers: Array<{
    sessionId: number;
    questionId: string;
    answeredAt: string;
    unit: string;
    stem: string;
    choices: unknown;
    selectedAnswer: number;
    correctAnswerIndex: number;
    explanation: string;
  }>;
};

type ReviewPayload = {
  session: {
    id: number;
    startedAt: string;
    completedAt: string | null;
    score: number;
    totalQuestions: number;
    unitFilter: string | null;
    immediateFeedback: boolean;
    timeLimitSeconds: number | null;
    answeredCount: number;
  };
  questions: Array<{
    questionId: string;
    answeredAt: string;
    selectedAnswer: number;
    isCorrect: boolean;
    unit: string;
    stem: string;
    choices: string[];
    correctAnswerIndex: number;
    explanation: string;
    difficulty: string | null;
  }>;
};

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function choiceArray(choices: unknown): string[] {
  if (!Array.isArray(choices)) {
    return [];
  }
  return choices.filter((entry): entry is string => typeof entry === "string");
}

export function CspPerformanceClient() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewData, setReviewData] = useState<ReviewPayload | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  const activeReviewQuestion = reviewData?.questions[reviewIndex] ?? null;

  async function openReview(sessionId: number) {
    setReviewLoading(true);
    setReviewError("");
    setReviewData(null);
    setReviewIndex(0);
    setReviewOpen(true);

    try {
      const response = await fetch(`/api/csp/review?sessionId=${sessionId}`);
      const payload = (await response.json()) as ReviewPayload | { error?: string };

      if (!response.ok || !("session" in payload)) {
        setReviewError((payload as { error?: string }).error ?? "Unable to load quiz review.");
        return;
      }

      setReviewData(payload);
    } catch {
      setReviewError("Unable to load quiz review.");
    } finally {
      setReviewLoading(false);
    }
  }

  async function loadProgress() {
    setLoading(true);
    try {
      const response = await fetch("/api/csp/progress");
      if (!response.ok) {
        setData(null);
        return;
      }
      const payload = (await response.json()) as ProgressPayload;
      setData(payload);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProgress();
  }, []);

  if (loading && !data) {
    return (
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Loading AP CSP performance…</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => void loadProgress()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Load AP CSP Progress
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">AP CSP Progress Dashboard</h2>
          <button
            type="button"
            onClick={() => void loadProgress()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sessions</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{data.summary.totalSessions}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{data.summary.completedSessions}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Overall Accuracy</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{toPercent(data.summary.overallAccuracy)}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Correct</th>
                <th className="px-2 py-2">Attempts</th>
                <th className="px-2 py-2">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {data.byUnit.map((row) => (
                <tr key={row.unit} className="border-b border-slate-100 text-slate-800">
                  <td className="px-2 py-2">{row.unit}</td>
                  <td className="px-2 py-2">{row.correct}</td>
                  <td className="px-2 py-2">{row.attempts}</td>
                  <td className="px-2 py-2">{toPercent(row.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Recent AP CSP Sessions</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-2 py-2">Mode</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.slice(0, 30).map((session) => (
                <tr key={session.id} className="border-b border-slate-100 text-slate-800">
                  <td className="px-2 py-2">{new Date(session.startedAt).toLocaleString()}</td>
                  <td className="px-2 py-2">{session.unitFilter ?? "All Units"}</td>
                  <td className="px-2 py-2">{session.score} / {session.totalQuestions}</td>
                  <td className="px-2 py-2">{session.immediateFeedback ? "Immediate" : "Exam"}</td>
                  <td className="px-2 py-2">{session.completedAt ? "Completed" : "Started"}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => void openReview(session.id)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Incorrect AP CSP Answers</h3>
        {data.incorrectAnswers.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-700">No incorrect answers yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.incorrectAnswers.slice(0, 25).map((item) => {
              const choices = choiceArray(item.choices);
              return (
                <div key={`${item.sessionId}-${item.questionId}-${item.answeredAt}`} className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">{item.unit} • Session #{item.sessionId}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.stem}</p>
                  <p className="mt-1 text-sm text-slate-700">Selected: {choices[item.selectedAnswer] ?? `Choice ${item.selectedAnswer + 1}`}</p>
                  <p className="text-sm text-slate-700">Correct: {choices[item.correctAnswerIndex] ?? `Choice ${item.correctAnswerIndex + 1}`}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.explanation}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">AP CSP Quiz Review</h3>
                {reviewData ? (
                  <p className="text-sm text-slate-600">
                    Session #{reviewData.session.id} • {reviewData.session.unitFilter ?? "All Units"} • {reviewData.session.score} / {reviewData.session.totalQuestions}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewOpen(false);
                  setReviewError("");
                  setReviewData(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-4rem)] overflow-y-auto px-4 py-4">
              {reviewLoading ? <p className="text-sm text-slate-600">Loading review…</p> : null}
              {!reviewLoading && reviewError ? <p className="text-sm text-red-700">{reviewError}</p> : null}
              {!reviewLoading && !reviewError && reviewData ? (
                reviewData.questions.length > 0 && activeReviewQuestion ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        Question {reviewIndex + 1} of {reviewData.questions.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewIndex((current) => Math.max(0, current - 1))}
                          disabled={reviewIndex === 0}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewIndex((current) => Math.min(reviewData.questions.length - 1, current + 1))}
                          disabled={reviewIndex >= reviewData.questions.length - 1}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">
                        {activeReviewQuestion.unit}{activeReviewQuestion.difficulty ? ` • ${activeReviewQuestion.difficulty}` : ""}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{activeReviewQuestion.stem}</p>
                      <div className="mt-2 space-y-1.5">
                        {activeReviewQuestion.choices.map((choice, choiceIndex) => {
                          const isCorrect = choiceIndex === activeReviewQuestion.correctAnswerIndex;
                          const isSelected = choiceIndex === activeReviewQuestion.selectedAnswer;
                          const className = isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : isSelected
                              ? "border-red-300 bg-red-50 text-red-900"
                              : "border-slate-200 bg-white text-slate-700";

                          return (
                            <div key={`${activeReviewQuestion.questionId}-${choiceIndex}`} className={`rounded-md border px-3 py-2 text-sm ${className}`}>
                              <span className="font-semibold">{String.fromCharCode(65 + choiceIndex)}.</span> {choice}
                            </div>
                          );
                        })}
                      </div>
                      <p className={`mt-2 text-sm font-semibold ${activeReviewQuestion.isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                        {activeReviewQuestion.isCorrect ? "Correct" : "Incorrect"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{activeReviewQuestion.explanation}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">This quiz has no answered questions yet.</p>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
