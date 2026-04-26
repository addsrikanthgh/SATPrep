"use client";

import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student-context";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type QuizSessionRow = {
  id: number;
  quizType: "meaning" | "blank" | string;
  quizNumber: number;
  quizName: string;
  alphabetLetter: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  status: string;
  createdAt: string;
};

type ProgressPayload = {
  summary: {
    totalSessions: number;
    completedSessions: number;
    totalAnswered: number;
    totalCorrect: number;
    overallAccuracy: number;
    byType: {
      meaning: { sessions: number; answered: number; correct: number; accuracy: number };
      blank: { sessions: number; answered: number; correct: number; accuracy: number };
    };
  };
  wordProgress: {
    wordsTracked: number;
    weakWords: number;
    perfectWords: number;
    totalSeen: number;
    totalCorrect: number;
    overallAccuracy: number;
  };
  allWordsMastery: {
    totalWordsInBank: number;
    wordsSeen: number;
    masteredWords: number;
    coveragePercent: number;
    masteryPercentOfAllWords: number;
    masteryPercentOfSeenWords: number;
    masteryRule: string;
  };
  masteryByLetter: Array<{
    letter: string;
    totalWords: number;
    wordsSeen: number;
    masteredWords: number;
    coveragePercent: number;
    masteryPercent: number;
  }>;
  filters: {
    quizType: string;
    letter: string;
    from: string;
    to: string;
  };
  sessions: QuizSessionRow[];
};

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function cardValue(value: number | string) {
  return <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>;
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value * 100)));

  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function ProgressClient() {
  const { student } = useStudent();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [quizType, setQuizType] = useState("all");
  const [letter, setLetter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("quizType", quizType);
      params.set("letter", letter);

      if (fromDate) {
        params.set("from", fromDate);
      }

      if (toDate) {
        params.set("to", toDate);
      }

      const response = await fetch(`/api/progress/quiz-scores?${params.toString()}`);
      const payload = (await response.json()) as ProgressPayload;
      setData(payload);
      setLoading(false);
    }

    void loadProgress();
  }, [quizType, letter, fromDate, toDate, student?.id]);

  const sessions = data?.sessions ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        <p className="mt-1 text-sm text-slate-600">Filter quiz analytics by quiz type, alphabet, and date range.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            <span className="block font-medium">Quiz Type</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={quizType}
              onChange={(event) => setQuizType(event.target.value)}
            >
              <option value="all">All</option>
              <option value="meaning">Meaning</option>
              <option value="blank">Blank</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="block font-medium">Alphabet Letter</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={letter}
              onChange={(event) => setLetter(event.target.value)}
            >
              <option value="all">All</option>
              {letters.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            <span className="block font-medium">From Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="block font-medium">To Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              setQuizType("all");
              setLetter("all");
              setFromDate("");
              setToDate("");
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Filters
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All Words Mastery</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your long-term mastery across the full SAT word bank.
        </p>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading mastery...</p> : null}

        {!loading && data ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mastered Words</p>
              {cardValue(`${data.allWordsMastery.masteredWords} / ${data.allWordsMastery.totalWordsInBank}`)}
              <p className="mt-1 text-xs text-slate-600">{toPercent(data.allWordsMastery.masteryPercentOfAllWords)} of all words</p>
              <ProgressBar value={data.allWordsMastery.masteryPercentOfAllWords} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Coverage</p>
              {cardValue(`${data.allWordsMastery.wordsSeen} / ${data.allWordsMastery.totalWordsInBank}`)}
              <p className="mt-1 text-xs text-slate-600">{toPercent(data.allWordsMastery.coveragePercent)} words attempted at least once</p>
              <ProgressBar value={data.allWordsMastery.coveragePercent} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mastery Of Seen Words</p>
              {cardValue(toPercent(data.allWordsMastery.masteryPercentOfSeenWords))}
              <p className="mt-1 text-xs text-slate-600">How many attempted words are currently mastered</p>
              <ProgressBar value={data.allWordsMastery.masteryPercentOfSeenWords} />
            </div>
          </div>
        ) : null}

        {!loading && data ? (
          <p className="mt-3 text-xs text-slate-500">{data.allWordsMastery.masteryRule}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Quiz Score Summary</h2>
        <p className="mt-1 text-sm text-slate-600">Track completed quizzes, total score, and recent performance.</p>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading progress...</p> : null}

        {!loading && data ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Quizzes</p>
              {cardValue(data.summary.totalSessions)}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed</p>
              {cardValue(data.summary.completedSessions)}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Score</p>
              {cardValue(`${data.summary.totalCorrect} / ${data.summary.totalAnswered}`)}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall Accuracy</p>
              {cardValue(toPercent(data.summary.overallAccuracy))}
            </div>
          </div>
        ) : null}
      </section>

      {!loading && data ? (
        <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Progress Breakdown</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Meaning Quiz Accuracy</p>
              {cardValue(toPercent(data.summary.byType.meaning.accuracy))}
              <p className="mt-1 text-xs text-slate-600">
                {data.summary.byType.meaning.correct} / {data.summary.byType.meaning.answered} answers
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Blank Quiz Accuracy</p>
              {cardValue(toPercent(data.summary.byType.blank.accuracy))}
              <p className="mt-1 text-xs text-slate-600">
                {data.summary.byType.blank.correct} / {data.summary.byType.blank.answered} answers
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Words Tracked</p>
              {cardValue(data.wordProgress.wordsTracked)}
              <p className="mt-1 text-xs text-slate-600">Unique words seen in quiz answers</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Weak Words</p>
              {cardValue(data.wordProgress.weakWords)}
              <p className="mt-1 text-xs text-slate-600">Words with one or more incorrect answers</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Quiz Sessions</h2>
        <p className="mt-1 text-sm text-slate-600">Latest 100 quizzes matching the selected filters.</p>

        {!loading && sessions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No quiz sessions yet. Start a quiz to build your progress history.</p>
        ) : null}

        {!loading && sessions.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">Quiz</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Letter</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Accuracy</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const accuracy = session.answeredCount > 0 ? session.correctCount / session.answeredCount : 0;
                  const typeLabel = session.quizType === "blank" ? "Blank" : "Meaning";
                  const startedAt = new Date(session.createdAt).toLocaleString();

                  return (
                    <tr key={session.id} className="border-b border-slate-100 align-top text-slate-800">
                      <td className="px-2 py-2">
                        <p className="font-semibold text-slate-900">#{session.quizNumber} {session.quizName}</p>
                      </td>
                      <td className="px-2 py-2">{typeLabel}</td>
                      <td className="px-2 py-2">{session.alphabetLetter}</td>
                      <td className="px-2 py-2">
                        {session.correctCount} / {session.questionCount}
                      </td>
                      <td className="px-2 py-2">{toPercent(accuracy)}</td>
                      <td className="px-2 py-2">{session.status.replaceAll("_", " ")}</td>
                      <td className="px-2 py-2">{startedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {!loading && data ? (
        <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mastery By Letter</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track mastery progress for each alphabet letter using the same mastery rule.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">Letter</th>
                  <th className="px-2 py-2">Mastered</th>
                  <th className="px-2 py-2">Seen</th>
                  <th className="px-2 py-2">Coverage</th>
                  <th className="px-2 py-2">Mastery %</th>
                </tr>
              </thead>
              <tbody>
                {data.masteryByLetter.map((row) => (
                  <tr key={row.letter} className="border-b border-slate-100 align-top text-slate-800">
                    <td className="px-2 py-2 font-semibold text-slate-900">{row.letter}</td>
                    <td className="px-2 py-2">
                      {row.masteredWords} / {row.totalWords}
                    </td>
                    <td className="px-2 py-2">
                      {row.wordsSeen} / {row.totalWords}
                    </td>
                    <td className="px-2 py-2">{toPercent(row.coveragePercent)}</td>
                    <td className="px-2 py-2">{toPercent(row.masteryPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
