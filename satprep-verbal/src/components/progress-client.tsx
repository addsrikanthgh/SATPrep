"use client";

import { Fragment, useEffect, useState } from "react";
import { useStudent } from "@/lib/student-context";

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

type PassageProgressPayload = {
  summary: {
    totalQuizzes: number;
    completedQuizzes: number;
    answered: number;
    correct: number;
    overallAccuracy: number;
  };
  byDomain: Array<{
    domain: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }>;
  bySkill: Array<{
    domain: string;
    skill: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }>;
  sessions: Array<{
    id: number;
    quizNumber: number;
    quizName: string;
    questionCount: number;
    answeredCount: number;
    correctCount: number;
    status: string;
    createdAt: string;
  }>;
};

type PassageReviewItem = {
  passageSetId: string;
  title: string;
  passage: string;
  difficulty: string;
  domain: string;
  skill: string;
  isCorrect: boolean;
  createdAt: string;
  questions: Array<{
    questionId: string;
    questionType: string;
    questionText: string;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    correctAnswer: string;
    explanation: string;
    selectedAnswer: string;
    isCorrect: boolean;
  }>;
};

type PassageReviewPayload = {
  passages: PassageReviewItem[];
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
  const {
    student,
    adminUnlocked, adminPassword, viewingStudentId, adminStudents,
  } = useStudent();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageData, setPassageData] = useState<PassageProgressPayload | null>(null);
  const [quizType, setQuizType] = useState("all");
  const [letter, setLetter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewPassages, setReviewPassages] = useState<PassageReviewItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("quizType", quizType);
      params.set("letter", letter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      let url: string;
      const headers: HeadersInit = {};

      if (adminUnlocked && viewingStudentId) {
        params.set("studentId", viewingStudentId);
        url = `/api/admin/progress/quiz-scores?${params.toString()}`;
        headers["x-admin-passcode"] = adminPassword;
      } else {
        url = `/api/progress/quiz-scores?${params.toString()}`;
      }

      const response = await fetch(url, { headers });
      if (response.ok) {
        const payload = (await response.json()) as ProgressPayload;
        setData(payload);
      } else {
        setData(null);
      }
      setLoading(false);
    }

    void loadProgress();
  }, [quizType, letter, fromDate, toDate, student?.id, adminUnlocked, viewingStudentId, adminPassword]);

  useEffect(() => {
    async function loadPassageProgress() {
      setPassageLoading(true);

      let url: string;
      const headers: HeadersInit = {};

      if (adminUnlocked && viewingStudentId) {
        url = `/api/admin/progress/passage-scores?studentId=${encodeURIComponent(viewingStudentId)}`;
        headers["x-admin-passcode"] = adminPassword;
      } else {
        url = "/api/progress/passage-scores";
      }

      const response = await fetch(url, { headers });
      if (response.ok) {
        const payload = (await response.json()) as PassageProgressPayload;
        setPassageData(payload);
      } else {
        setPassageData(null);
      }
      setPassageLoading(false);
    }

    void loadPassageProgress();
  }, [student?.id, adminUnlocked, viewingStudentId, adminPassword]);

  const sessions = data?.sessions ?? [];
  const activeReview = reviewPassages[reviewIndex] ?? null;
  const viewingStudent = adminUnlocked && viewingStudentId
    ? adminStudents.find((s) => s.id === viewingStudentId)
    : null;

  async function openPassageReview(options: { domain?: string; skill?: string; title: string }) {
    setReviewLoading(true);
    setReviewError("");
    setReviewOpen(true);
    setReviewTitle(options.title);
    setReviewPassages([]);
    setReviewIndex(0);

    try {
      const params = new URLSearchParams();
      if (options.domain) params.set("domain", options.domain);
      if (options.skill) params.set("skill", options.skill);

      let url: string;
      const headers: HeadersInit = {};

      if (adminUnlocked && viewingStudentId) {
        params.set("studentId", viewingStudentId);
        url = `/api/admin/progress/passage-review?${params.toString()}`;
        headers["x-admin-passcode"] = adminPassword;
      } else {
        url = `/api/progress/passage-review?${params.toString()}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setReviewError(payload.error ?? "Unable to load passage review.");
        setReviewLoading(false);
        return;
      }

      const payload = (await response.json()) as PassageReviewPayload;
      const ordered = [...payload.passages].sort((a, b) => {
        if (a.isCorrect !== b.isCorrect) {
          return a.isCorrect ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setReviewPassages(ordered);
    } catch {
      setReviewError("Unable to load passage review.");
    }

    setReviewLoading(false);
  }

  const sectionContent = {
    progressBreakdown: !loading && data ? (
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
    ) : null,

    allWordsMastery: (
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
    ),

    quizScoreSummary: (
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
    ),

    passageQuizSummary: (
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Passage Quiz Summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          Domain and skill tracking for the new passage quiz, including read-once attempts.
        </p>

        {passageLoading ? <p className="mt-4 text-sm text-slate-600">Loading passage progress...</p> : null}

        {!passageLoading && passageData ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Passage Quizzes</p>
                {cardValue(passageData.summary.totalQuizzes)}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed</p>
                {cardValue(passageData.summary.completedQuizzes)}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Score</p>
                {cardValue(`${passageData.summary.correct} / ${passageData.summary.answered}`)}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall Accuracy</p>
                {cardValue(toPercent(passageData.summary.overallAccuracy))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">By Domain</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-2 py-1">Domain</th>
                        <th className="px-2 py-1">Score</th>
                        <th className="px-2 py-1">Accuracy</th>
                        <th className="px-2 py-1">Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passageData.byDomain.map((row) => (
                        <tr key={row.domain} className="border-b border-slate-100 text-slate-800">
                          <td className="px-2 py-1">{row.domain}</td>
                          <td className="px-2 py-1">
                            {row.correct} / {row.attempts}
                          </td>
                          <td className="px-2 py-1">{toPercent(row.accuracy)}</td>
                          <td className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() => openPassageReview({ domain: row.domain, title: `Review Domain: ${row.domain}` })}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">By Skill</p>
                <div className="mt-2 max-h-72 overflow-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-2 py-1">Domain</th>
                        <th className="px-2 py-1">Skill</th>
                        <th className="px-2 py-1">Score</th>
                        <th className="px-2 py-1">Accuracy</th>
                        <th className="px-2 py-1">Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passageData.bySkill.map((row) => (
                        <tr key={`${row.domain}-${row.skill}`} className="border-b border-slate-100 text-slate-800">
                          <td className="px-2 py-1">{row.domain}</td>
                          <td className="px-2 py-1">{row.skill}</td>
                          <td className="px-2 py-1">
                            {row.correct} / {row.attempts}
                          </td>
                          <td className="px-2 py-1">{toPercent(row.accuracy)}</td>
                          <td className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() => openPassageReview({ domain: row.domain, skill: row.skill, title: `Review Skill: ${row.domain} · ${row.skill}` })}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    ),

    recentQuizSessions: (
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
    ),

    masteryByLetter: !loading && data ? (
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
    ) : null,
  };

  const sectionOrder: Array<keyof typeof sectionContent> = [
    "progressBreakdown",
    "allWordsMastery",
    "quizScoreSummary",
    "passageQuizSummary",
    "recentQuizSessions",
    "masteryByLetter",
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      {viewingStudent ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm font-medium text-amber-800">
            Showing data for: <span className="font-semibold">{viewingStudent.name ?? viewingStudent.email ?? viewingStudent.id}</span>
            {viewingStudent.email && viewingStudent.name ? (
              <span className="ml-1 font-normal text-amber-700">({viewingStudent.email})</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {sectionOrder.map((sectionKey) => (
        <Fragment key={sectionKey}>{sectionContent[sectionKey]}</Fragment>
      ))}

      {reviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{reviewTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">Incorrect passages are shown first, then correct passages.</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {reviewLoading ? <p className="mt-4 text-sm text-slate-600">Loading passages...</p> : null}
            {reviewError ? <p className="mt-4 text-sm text-red-700">{reviewError}</p> : null}

            {!reviewLoading && !reviewError && reviewPassages.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No matching passages found for this review filter.</p>
            ) : null}

            {!reviewLoading && activeReview ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activeReview.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {activeReview.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">Domain: {activeReview.domain}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">Skill: {activeReview.skill}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">{reviewIndex + 1} / {reviewPassages.length}</span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h4 className="text-sm font-semibold text-slate-900">{activeReview.title}</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{activeReview.passage}</p>
                </div>

                {activeReview.questions.map((question) => (
                  <div key={question.questionId} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{question.questionText}</p>

                    <div className="mt-3 grid gap-2">
                      {([
                        ["A", question.choiceA],
                        ["B", question.choiceB],
                        ["C", question.choiceC],
                        ["D", question.choiceD],
                      ] as const).map(([label, text]) => {
                        const isSelected = question.selectedAnswer === label;
                        const isCorrect = question.correctAnswer === label;

                        let choiceClassName = "border-slate-200 bg-white text-slate-800";
                        if (isCorrect) {
                          choiceClassName = "border-emerald-300 bg-emerald-50 text-emerald-900";
                        } else if (isSelected) {
                          choiceClassName = "border-red-300 bg-red-50 text-red-900";
                        }

                        return (
                          <div key={label} className={`rounded-md border px-3 py-2 text-sm ${choiceClassName}`}>
                            <span className="font-semibold">{label}.</span> {text}
                            {isSelected ? <span className="ml-2 text-xs font-semibold">(Selected)</span> : null}
                            {isCorrect ? <span className="ml-2 text-xs font-semibold">(Correct)</span> : null}
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-2 text-xs text-slate-600">
                      Selected: <span className="font-semibold text-slate-800">{question.selectedAnswer}</span>
                      {" · "}
                      Correct: <span className="font-semibold text-slate-800">{question.correctAnswer}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{question.explanation}</p>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewIndex((idx) => Math.max(0, idx - 1))}
                    disabled={reviewIndex === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewIndex((idx) => Math.min(reviewPassages.length - 1, idx + 1))}
                    disabled={reviewIndex >= reviewPassages.length - 1}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
