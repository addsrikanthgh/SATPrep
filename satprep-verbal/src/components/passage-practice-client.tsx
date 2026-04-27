"use client";

import { useState } from "react";

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

export function PassagePracticeClient() {
  const [questionCount, setQuestionCount] = useState(defaultCount);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<PassageQuizSession | null>(null);
  const [item, setItem] = useState<PassageItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedChoice, setSelectedChoice] = useState<"A" | "B" | "C" | "D" | null>(null);

  async function startQuiz() {
    setLoading(true);
    setError("");
    setDone(false);
    setFeedback(null);
    setSelectedChoice(null);

    try {
      const startResponse = await fetch("/api/quiz/passages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount }),
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
    } else {
      setItem(payload.item ?? null);
    }

    setLoading(false);
  }

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
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      {!session ? (
        <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Start Passage Quiz</h2>
          <p className="mt-1 text-sm text-slate-600">
            Mixed passages across all domains and skills. Each passage can be read only once per student.
          </p>

          <label className="mt-4 block text-sm text-slate-700">
            <span className="block font-medium">Question count</span>
            <input
              type="number"
              min={1}
              max={100}
              value={questionCount}
              onChange={(event) => setQuestionCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
              className="mt-1 w-36 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={startQuiz}
            disabled={loading}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Starting..." : "Start Passage Quiz"}
          </button>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {session ? (
        <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-800">{session.quizName}</span>
            <span>
              Score: {session.correctCount} / {session.answeredCount}
            </span>
            <span>
              Target: {session.questionCount}
            </span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              End Quiz
            </button>
          </div>
        </section>
      ) : null}

      {session && item ? (
        <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded bg-slate-100 px-2 py-1">Domain: {item.domain}</span>
            <span className="rounded bg-slate-100 px-2 py-1">Skill: {item.skill}</span>
            <span className="rounded bg-slate-100 px-2 py-1">Difficulty: {item.difficulty}</span>
          </div>

          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {item.readPolicy}
          </p>

          {item.passage ? (
            <article className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
              {item.passage}
            </article>
          ) : (
            <article className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-500">
              Passage hidden (already read once).
            </article>
          )}

          <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>

          <div className="mt-3 grid gap-2">
            {(["A", "B", "C", "D"] as const).map((choice) => {
              const isSelected = selectedChoice === choice;
              const isCorrect = feedback?.correctAnswer === choice;
              const isWrongSelection = feedback && isSelected && !feedback.isCorrect;

              const className = feedback
                ? isCorrect
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : isWrongSelection
                    ? "border-red-500 bg-red-50 text-red-900"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";

              return (
                <button
                  key={choice}
                  type="button"
                  disabled={!!feedback || loading}
                  onClick={() => submitAnswer(choice)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${className}`}
                >
                  <span className="font-semibold">{choice}.</span> {item.choices[choice]}
                </button>
              );
            })}
          </div>

          {feedback ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              <p className={feedback.isCorrect ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {feedback.isCorrect ? "Correct." : `Incorrect. Correct answer: ${feedback.correctAnswer}`}
              </p>
              <p className="mt-2 text-slate-700">{feedback.explanation}</p>
              <button
                type="button"
                onClick={nextQuestion}
                className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Next Question
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {session && done ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm">
          <p className="font-semibold">Passage quiz complete.</p>
          <p className="mt-1">
            Final score: {session.correctCount} / {session.answeredCount}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
          >
            Start Another Passage Quiz
          </button>
        </section>
      ) : null}
    </div>
  );
}
