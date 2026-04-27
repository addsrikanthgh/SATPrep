"use client";

import { useEffect, useState } from "react";
import { useStudent } from "@/lib/student-context";

type WeakWord = {
  wordId: number;
  word: string;
  partOfSpeech: string;
  meaning: string;
  sentence: string;
  sentenceCount: number;
  alphabetLetter: string;
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  lastResult: boolean | null;
};

export function WeakWordsClient() {
  const { student } = useStudent();
  const [weakWords, setWeakWords] = useState<WeakWord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadWeakWords() {
      setLoading(true);
      const response = await fetch(`/api/progress/weak-words`);
      const payload = (await response.json()) as { weakWords: WeakWord[] };
      setWeakWords(payload.weakWords ?? []);
      setLoading(false);
    }

    void loadWeakWords();
  }, [student?.id]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Weak Words</h2>
        <p className="mt-1 text-sm text-slate-600">
          Words answered incorrectly at least once, sorted by lowest accuracy first.
        </p>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading weak words...</p> : null}

        {!loading && weakWords.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            No weak words yet. Practice quizzes and any incorrect answers will appear here.
          </p>
        ) : null}

        {!loading && weakWords.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">Word</th>
                  <th className="px-2 py-2">Meaning</th>
                  <th className="px-2 py-2">Incorrect</th>
                  <th className="px-2 py-2">Seen</th>
                  <th className="px-2 py-2">Accuracy</th>
                  <th className="px-2 py-2">Usage Sentence</th>
                </tr>
              </thead>
              <tbody>
                {weakWords.map((row) => (
                  <tr key={row.wordId} className="border-b border-slate-100 align-top text-slate-800">
                    <td className="px-2 py-2">
                      <p className="font-semibold text-slate-900">{row.word}</p>
                      <p className="text-xs text-slate-500">
                        {row.partOfSpeech} - {row.alphabetLetter}
                      </p>
                    </td>
                    <td className="px-2 py-2">{row.meaning}</td>
                    <td className="px-2 py-2">{row.incorrectCount}</td>
                    <td className="px-2 py-2">{row.seenCount}</td>
                    <td className="px-2 py-2">{Math.round(row.accuracy * 100)}%</td>
                    <td className="px-2 py-2">
                      <p>{row.sentence}</p>
                      <p className="text-xs text-slate-500">Configured: {row.sentenceCount}/5</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
