import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfiguredSentences, pickSentence } from "@/lib/sentences";
import { auth } from "@/auth";

type QuizQuestion = {
  wordId: number;
  word: string;
  sentence: string;
  allSentences: string[];
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

function parseMode(rawValue: string | null) {
  return rawValue?.toLowerCase() === "random" ? "random" : "first";
}

function parseWeakOnly(rawValue: string | null) {
  if (!rawValue) {
    return false;
  }

  const value = rawValue.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId = session.user.id;

  const { searchParams } = new URL(request.url);
  const letterSelection = parseLetters(searchParams.get("letters") ?? searchParams.get("letter"));
  const mode = parseMode(searchParams.get("mode"));
  const weakOnly = parseWeakOnly(searchParams.get("weakOnly"));
  const countRaw = (searchParams.get("count") ?? "10").toLowerCase();
  const countParsed = Number(countRaw);
  const isAllWords = countRaw === "all";

  const take = isAllWords
    ? undefined
    : Number.isFinite(countParsed) && countParsed > 0
      ? Math.min(countParsed, 500)
      : 10;

  const rangeSizeRaw = Number(searchParams.get("rangeSize"));
  const rangeSize =
    Number.isFinite(rangeSizeRaw) && rangeSizeRaw > 0 ? Math.min(rangeSizeRaw, 500) : null;
  const rangesRaw = searchParams.get("ranges");
  const ranges = rangesRaw
    ? rangesRaw
        .split(",")
        .map(Number)
        .filter((n) => Number.isFinite(n) && n >= 0)
    : null;
  const useRanges = ranges !== null && ranges.length > 0 && rangeSize !== null;

  const letterWhere =
    letterSelection === "all" ? {} : { alphabetLetter: { in: letterSelection } };

  let weakWordIds: number[] | null = null;

  if (weakOnly) {
    const weakProgressRows = await prisma.studentProgress.findMany({
      where: {
        studentId,
        seenCount: { gt: 0 },
      },
      select: {
        wordId: true,
        seenCount: true,
        correctCount: true,
      },
    });

    weakWordIds = weakProgressRows
      .filter((row) => row.seenCount - row.correctCount > 0)
      .map((row) => row.wordId);

    if (weakWordIds.length === 0) {
      return NextResponse.json({
        letters: letterSelection === "all" ? "ALL" : letterSelection,
        count: 0,
        allWords: false,
        questions: [],
      });
    }
  }

  const whereClause = {
    ...letterWhere,
    ...(weakWordIds ? { id: { in: weakWordIds } } : {}),
  };

  const words = await prisma.word.findMany({
    where: whereClause,
    orderBy: [{ alphabetLetter: "asc" }, { alphabetOrder: "asc" }],
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

  let selectedWords: typeof words;
  if (useRanges && rangeSize !== null && ranges !== null) {
    const wordsFromRanges = ranges.flatMap((offset) => words.slice(offset, offset + rangeSize));
    selectedWords = mode === "random" ? shuffle(wordsFromRanges) : wordsFromRanges;
  } else {
    const candidateWords = mode === "random" ? shuffle(words) : words;
    selectedWords = take ? candidateWords.slice(0, take) : candidateWords;
  }

  const questions: QuizQuestion[] = selectedWords.map((word) => {
    const selectedSentence = pickSentence(word);
    const allSentences = getConfiguredSentences(word);
    const wrongChoices = shuffle(distractors.filter((value) => value !== word.synonym)).slice(0, 3);
    const choices = shuffle([word.synonym, ...wrongChoices]);

    return {
      wordId: word.id,
      word: word.word,
      sentence: selectedSentence.sentence,
      allSentences,
      sentenceCount: selectedSentence.sentenceCount,
      sentenceIndex: selectedSentence.sentenceIndex,
      choices,
      answer: word.synonym,
    };
  });

  return NextResponse.json({
    letters: letterSelection === "all" ? "ALL" : letterSelection,
    count: selectedWords.length,
    allWords: isAllWords,
    questions: shuffle(questions),
  });
}
