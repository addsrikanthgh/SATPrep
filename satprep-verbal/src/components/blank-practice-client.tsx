"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudent } from "@/lib/student-context";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSentenceWithPrimaryWordBold(sentence: string, primaryWord: string) {
  if (!sentence || !primaryWord) {
    return sentence;
  }

  const pattern = new RegExp(`\\b(${escapeRegExp(primaryWord)})\\b`, "gi");
  const parts = sentence.split(pattern);

  if (parts.length <= 1) {
    return sentence;
  }

  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === primaryWord.toLowerCase();
    return isMatch ? <strong key={`${part}-${index}`}>{part}</strong> : part;
  });
}

type BlankQuizQuestion = {
  wordId: number;
  word: string;
  meaning: string;
  blankSentence: string;
  sentence: string;
  sentenceCount: number;
  sentenceIndex: number;
  choices: string[];
  answer: string;
};

type QuizSession = {
  id: number;
  quizNumber: number;
  quizName: string;
  alphabetLetter: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  status: string;
};

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const batchOptions = [10, 20, 30, 40, 50, "all"] as const;
const randomBatchOptions = [10, 20, 50] as const;

export function BlankPracticeClient() {
  const { student } = useStudent();
  const [selectedLetters, setSelectedLetters] = useState<string[]>(["A"]);
  const [batch, setBatch] = useState<number | "all">(20);
  const [mode, setMode] = useState<"first" | "random" | "weak">("first");
  const [quiz, setQuiz] = useState<BlankQuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [feedback, setFeedback] = useState<string>("");
  const [showSentence, setShowSentence] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupVisible, setSetupVisible] = useState(true);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (setupVisible) {
      setCompleted(false);
    }
  }, [setupVisible]);

  useEffect(() => {
    let active = true;

    async function loadLetterCounts() {
      try {
        const response = await fetch("/api/quiz/letter-counts?quizType=blank");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { counts?: Record<string, number> };
        if (active && payload.counts) {
          setLetterCounts(payload.counts);
        }
      } catch {
        // Keep setup usable even if count loading fails.
      }
    }

    void loadLetterCounts();

    return () => {
      active = false;
    };
  }, []);

  const currentQuiz = useMemo(() => quiz[quizIndex], [quiz, quizIndex]);
  const currentMeaning = currentQuiz?.meaning?.trim() || "Meaning unavailable";
  const totalLetterCount = useMemo(
    () => letters.reduce((sum, letter) => sum + (letterCounts[letter] ?? 0), 0),
    [letterCounts],
  );

  function isAllLettersSelected() {
    return selectedLetters.length === letters.length;
  }

  function toggleLetter(value: string) {
    setSelectedLetters((previous) => {
      if (previous.includes(value)) {
        const next = previous.filter((letter) => letter !== value);
        return next.length > 0 ? next : ["A"];
      }

      const next = [...previous, value].sort();
      return next;
    });
  }

  function toggleAllLetters() {
    setSelectedLetters((previous) => {
      if (previous.length === letters.length) {
        return ["A"];
      }
      return [...letters];
    });
  }

  async function startQuiz() {
    setLoading(true);
    setFeedback("");
    setShowSentence(false);
    setQuestionAnswered(false);
    setCompleted(false);

    const lettersQuery = isAllLettersSelected() ? "all" : selectedLetters.join(",");
    const countQuery = mode === "weak" ? "all" : batch === "all" ? "all" : String(batch);
    const params = new URLSearchParams({
      letters: lettersQuery,
      count: countQuery,
      mode: mode === "random" ? "random" : "first",
    });

    if (mode === "weak") {
      params.set("weakOnly", "true");
      params.set("studentId", student?.id ?? "local-default-student");
    }

    const quizResponse = await fetch(`/api/quiz/blanks?${params.toString()}`);
    const quizPayload = (await quizResponse.json()) as { questions: BlankQuizQuestion[] };
    const questions = quizPayload.questions ?? [];

    if (questions.length === 0) {
      setQuiz([]);
      setLoading(false);
      return;
    }

    const startResponse = await fetch("/api/quiz/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student?.id ?? "local-default-student",
        quizType: "blank",
        alphabetLetter: isAllLettersSelected() ? "ALL" : selectedLetters.join(","),
        questionCount: questions.length,
      }),
    });

    const sessionPayload = (await startResponse.json()) as QuizSession;

    setSession(sessionPayload);
    setQuiz(questions);
    setQuizIndex(0);
    setSetupVisible(false);
    setLoading(false);
  }

  async function submitAnswer(choice: string) {
    if (!currentQuiz || questionAnswered || !session) {
      return;
    }

    const isCorrect = choice === currentQuiz.answer;

    const response = await fetch("/api/quiz/meaning/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student?.id ?? "local-default-student",
        wordId: currentQuiz.wordId,
        isCorrect,
        quizSessionId: session.id,
      }),
    });

    const payload = (await response.json()) as { session: QuizSession | null };
    if (payload.session) {
      setSession(payload.session);
      if (payload.session.status === "completed") {
        setCompleted(true);
      }
    }

    setQuestionAnswered(true);
    setSelectedChoice(choice);
    setLastAnswerCorrect(isCorrect);

    setFeedback(
      isCorrect ? "Correct. You picked the missing word." : `Incorrect. Correct answer: ${currentQuiz.answer}`,
    );
    setShowSentence(true);
  }

  function nextQuestion() {
    if (!questionAnswered) {
      return;
    }

    setFeedback("");
    setShowSentence(false);
    setQuestionAnswered(false);
    setSelectedChoice(null);
    setLastAnswerCorrect(null);
    setQuizIndex((index) => {
      if (quiz.length === 0) {
        return 0;
      }
      if (index + 1 >= quiz.length) {
        setCompleted(true);
        return index;
      }
      return index + 1;
    });
  }

  function resetToSetup() {
    setSetupVisible(true);
    setSession(null);
    setQuiz([]);
    setQuizIndex(0);
    setFeedback("");
    setShowSentence(false);
    setQuestionAnswered(false);
    setSelectedChoice(null);
    setLastAnswerCorrect(null);
    setCompleted(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {setupVisible ? (
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Practice Setup</h2>
        <p className="mt-1 text-sm text-slate-600">Select one or more alphabets and how many words to practice.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAllLetters}
            className={`rounded-md border px-3 py-1 text-sm ${
              isAllLettersSelected()
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            All Alphabets ({totalLetterCount})
          </button>

          {letters.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleLetter(value)}
              className={`rounded-md border px-3 py-1 text-sm ${
                selectedLetters.includes(value)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {value} ({letterCounts[value] ?? 0})
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {batchOptions.map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => {
                setMode("first");
                setBatch(value);
              }}
              className={`rounded-md border px-3 py-1 text-sm ${
                mode === "first" && value === batch
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              {value === "all" ? "All Words" : `First ${value}`}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {randomBatchOptions.map((value) => (
            <button
              key={`random-${value}`}
              type="button"
              onClick={() => {
                setMode("random");
                setBatch(value);
              }}
              className={`rounded-md border px-3 py-1 text-sm ${
                mode === "random" && value === batch
                  ? "border-amber-700 bg-amber-600 text-white"
                  : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
            >
              Random {value}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setMode("weak")}
            className={`rounded-md border px-3 py-1 text-sm ${
              mode === "weak"
                ? "border-rose-700 bg-rose-700 text-white"
                : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            Weak Words Quiz
          </button>
        </div>

        <button
          type="button"
          onClick={() => void startQuiz()}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {mode === "weak" ? "Start Weak Words Quiz" : "Start Quiz"}
        </button>
      </section>
      ) : null}

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Fill In The Blank</h2>

        {loading ? <p className="mt-2 text-sm text-slate-600">Loading questions...</p> : null}

        {!loading && !setupVisible && !currentQuiz ? (
          <p className="mt-2 text-sm text-slate-600">No blank questions found for this selection. Start a new quiz.</p>
        ) : null}

        {!setupVisible && !completed && currentQuiz ? (
          <div className="mt-3">
            <p className="text-sm text-slate-500">
              Question {quizIndex + 1} of {quiz.length}
            </p>
            <p className="mt-2 text-base text-slate-900">{currentQuiz.blankSentence}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {currentQuiz.choices.map((choice) => {
                let btnClass = "rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ";
                if (questionAnswered) {
                  if (choice === currentQuiz.answer) {
                    btnClass += "border-emerald-600 bg-emerald-50 text-emerald-900 cursor-not-allowed";
                  } else if (choice === selectedChoice) {
                    btnClass += "border-red-500 bg-red-50 text-red-900 cursor-not-allowed";
                  } else {
                    btnClass += "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed";
                  }
                } else {
                  btnClass += "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
                }
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => void submitAnswer(choice)}
                    disabled={questionAnswered}
                    className={btnClass}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={nextQuestion}
              disabled={!questionAnswered}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Next Question
            </button>

            <p className={`mt-3 text-sm font-medium min-h-[1.25rem] ${feedback ? (lastAnswerCorrect ? "text-emerald-700" : "text-red-600") : "text-transparent select-none"}`}>
              {feedback || "\u00A0"}
            </p>

            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {showSentence ? (
                <>
                  <p className="font-medium text-slate-900">
                    {currentQuiz.word} : {currentMeaning}
                  </p>
                  <p className="mt-1 text-slate-700">{renderSentenceWithPrimaryWordBold(currentQuiz.sentence, currentQuiz.word)}</p>
                </>
              ) : <p className="text-transparent select-none">{"\u00A0"}</p>}
            </div>
          </div>
        ) : null}

        {!setupVisible && session && !completed ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Quiz:</span> #{session.quizNumber}
            </p>
            <p>
              <span className="font-medium text-slate-900">Alphabets:</span> {session.alphabetLetter}
            </p>
            <p>
              <span className="font-medium text-slate-900">Score:</span> {session.correctCount} / {session.questionCount}
            </p>
          </div>
        ) : null}

        {!setupVisible && completed ? (
          <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="text-base font-semibold">Quiz completed</p>
            <p className="mt-1">
              Final score: {session?.correctCount ?? 0} / {session?.questionCount ?? 0}
            </p>
            <button
              type="button"
              onClick={resetToSetup}
              className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Configure New Quiz
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
