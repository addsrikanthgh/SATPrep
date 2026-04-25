import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickSentence } from "@/lib/sentences";

type QuizQuestion = {
  wordId: number;
  word: string;
  sentence: string;
  sentenceCount: number;
  sentenceIndex: number;
  choices: string[];
  answer: string;
};

function shuffle<T>(values: T[]) {
  const list = [...values];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function parseLetters(rawValue: string | null) {
  if (!rawValue || rawValue.toLowerCase() === "all") {
    return "all" as const;
  }

  const letters = [...new Set(rawValue.split(",").map((value) => value.trim().toUpperCase()))].filter((value) =>
    /^[A-Z]$/.test(value),
  );

  if (letters.length === 0) {
    return ["A"];
  }

  if (letters.length === 26) {
    return "all" as const;
  }

  return letters;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const letterSelection = parseLetters(searchParams.get("letters") ?? searchParams.get("letter"));
  const countRaw = (searchParams.get("count") ?? "10").toLowerCase();
  const countParsed = Number(countRaw);
  const isAllWords = countRaw === "all";

  const take = isAllWords
    ? undefined
    : Number.isFinite(countParsed) && countParsed > 0
      ? Math.min(countParsed, 500)
      : 10;

  const letterWhere =
    letterSelection === "all" ? {} : { alphabetLetter: { in: letterSelection } };

  const words = await prisma.word.findMany({
    where: letterWhere,
    orderBy: [{ alphabetLetter: "asc" }, { alphabetOrder: "asc" }],
    ...(take ? { take } : {}),
    select: {
      id: true,
      word: true,
      synonym: true,
      sentence_1: true,
      sentence_2: true,
      sentence_3: true,
      sentence_4: true,
      sentence_5: true,
    },
  });

  const distractorPool = await prisma.word.findMany({
    where: letterWhere,
    select: { synonym: true },
    take: 1000,
  });

  const distractors = [...new Set(distractorPool.map((entry) => entry.synonym))];

  const questions: QuizQuestion[] = words.map((word) => {
    const selectedSentence = pickSentence(word);
    const wrongChoices = shuffle(distractors.filter((value) => value !== word.synonym)).slice(0, 3);
    const choices = shuffle([word.synonym, ...wrongChoices]);

    return {
      wordId: word.id,
      word: word.word,
      sentence: selectedSentence.sentence,
      sentenceCount: selectedSentence.sentenceCount,
      sentenceIndex: selectedSentence.sentenceIndex,
      choices,
      answer: word.synonym,
    };
  });

  return NextResponse.json({
    letters: letterSelection === "all" ? "ALL" : letterSelection,
    count: take ?? questions.length,
    allWords: isAllWords,
    questions: shuffle(questions),
  });
}
