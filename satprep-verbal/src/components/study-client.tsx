"use client";

import { useEffect, useMemo, useState } from "react";

type Word = {
  id: number;
  word: string;
  partOfSpeech: string;
  synonym: string;
  sentence: string;
  sentenceCount: number;
  sentenceIndex: number;
  alphabetLetter: string;
  alphabetOrder: number;
  blankQuestions: { blankSentence: string }[];
};

type QuizQuestion = {
  wordId: number;
  word: string;
  choices: string[];
  answer: string;
};

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const batchOptions = [10, 20, 30, 40, 50];

export function StudyClient() {
  const [letter, setLetter] = useState("A");
  const [batch, setBatch] = useState(10);
  const [words, setWords] = useState<Word[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [feedback, setFeedback] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadWords() {
      setLoading(true);
      setFeedback("");

      const wordsResponse = await fetch(`/api/words?letter=${letter}&batch=${batch}`);
      const wordsPayload = (await wordsResponse.json()) as { words: Word[] };
      setWords(wordsPayload.words ?? []);

      const quizResponse = await fetch(`/api/quiz/meaning?letter=${letter}&count=${batch}`);
      const quizPayload = (await quizResponse.json()) as { questions: QuizQuestion[] };
      setQuiz(quizPayload.questions ?? []);
      setQuizIndex(0);
      setLoading(false);
    }

    void loadWords();
  }, [letter, batch]);

  const currentQuiz = useMemo(() => quiz[quizIndex], [quiz, quizIndex]);

  async function submitAnswer(choice: string) {
    if (!currentQuiz) {
      return;
    }

    const isCorrect = choice === currentQuiz.answer;

    await fetch("/api/quiz/meaning/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wordId: currentQuiz.wordId,
        isCorrect,
      }),
    });

    setFeedback(isCorrect ? "Correct" : `Incorrect. Correct answer: ${currentQuiz.answer}`);
  }

  function nextQuestion() {
    setFeedback("");
    setQuizIndex((index) => {
      if (quiz.length === 0) {
        return 0;
      }
      return (index + 1) % quiz.length;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Word Selection</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose an alphabet letter and batch size (first 10, 20, 30, etc.).
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {letters.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLetter(value)}
              className={`rounded-md border px-3 py-1 text-sm ${
                value === letter
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {batchOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setBatch(value)}
              className={`rounded-md border px-3 py-1 text-sm ${
                value === batch
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              First {value}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Study Words</h2>
        {loading ? <p className="mt-2 text-sm text-slate-600">Loading...</p> : null}

        {!loading && words.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No words loaded yet. Run the database seed first with npm run db:seed.
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {words.map((word) => (
            <article key={word.id} className="rounded-lg border border-slate-200 p-3">
              <header className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{word.word}</h3>
                <span className="text-xs uppercase tracking-wide text-slate-500">{word.partOfSpeech}</span>
              </header>
              <p className="mt-2 text-sm text-slate-800">
                <span className="font-medium">Meaning:</span> {word.synonym}
              </p>
              <p className="mt-2 text-sm text-slate-700">{word.sentence}</p>
              <p className="mt-1 text-xs text-slate-500">
                Sentence {word.sentenceIndex}/{Math.max(word.sentenceCount, 1)} configured
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Meaning Practice</h2>

        {!currentQuiz ? (
          <p className="mt-2 text-sm text-slate-600">No quiz items found for this selection.</p>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-slate-500">
              Question {quizIndex + 1} of {quiz.length}
            </p>
            <p className="mt-2 text-base text-slate-900">
              What is the best meaning of <span className="font-semibold">{currentQuiz.word}</span>?
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {currentQuiz.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => void submitAnswer(choice)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                >
                  {choice}
                </button>
              ))}
            </div>

            {feedback ? <p className="mt-3 text-sm text-slate-800">{feedback}</p> : null}

            <button
              type="button"
              onClick={nextQuestion}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Next Question
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
