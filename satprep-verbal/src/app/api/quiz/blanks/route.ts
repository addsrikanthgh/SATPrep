import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { pickBlankSentencePair } from "@/lib/sentences";

export const runtime = "nodejs";

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

function shuffle<T>(values: T[]) {
  const list = [...values];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function surroundingChoices(words: string[], currentIndex: number, take: number) {
  const choices: string[] = [];
  let distance = 1;

  while (choices.length < take && (currentIndex - distance >= 0 || currentIndex + distance < words.length)) {
    const leftIndex = currentIndex - distance;
    const rightIndex = currentIndex + distance;

    if (leftIndex >= 0) {
      choices.push(words[leftIndex]);
    }

    if (choices.length < take && rightIndex < words.length) {
      choices.push(words[rightIndex]);
    }

    distance += 1;
  }

  return [...new Set(choices)].slice(0, take);
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

type SatWordEntry = {
  word: string;
  synonym?: string;
};

let satWordMeaningCache: Map<string, string> | null = null;

async function getSatWordMeanings() {
  if (satWordMeaningCache) {
    return satWordMeaningCache;
  }

  const projectRoot = process.cwd();
  const filePath = path.join(projectRoot, "..", "Verbal", "words", "SATWords.json");

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as SatWordEntry[];
    const map = new Map<string, string>();

    for (const entry of parsed) {
      const word = entry.word?.trim().toLowerCase();
      const synonym = entry.synonym?.trim();
      if (word && synonym) {
        map.set(word, synonym);
      }
    }

    satWordMeaningCache = map;
    return map;
  } catch {
    satWordMeaningCache = new Map();
    return satWordMeaningCache;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const letterSelection = parseLetters(searchParams.get("letters") ?? searchParams.get("letter"));
  const mode = parseMode(searchParams.get("mode"));
  const weakOnly = parseWeakOnly(searchParams.get("weakOnly"));
  const studentId = searchParams.get("studentId") ?? "local-default-student";
  const countRaw = (searchParams.get("count") ?? "20").toLowerCase();
  const countParsed = Number(countRaw);
  const isAllWords = countRaw === "all";

  const take = isAllWords
    ? undefined
    : Number.isFinite(countParsed) && countParsed > 0
      ? Math.min(countParsed, 1000)
      : 20;

  const rangeSizeRaw = Number(searchParams.get("rangeSize"));
  const rangeSize =
    Number.isFinite(rangeSizeRaw) && rangeSizeRaw > 0 ? Math.min(rangeSizeRaw, 1000) : null;
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

  const allLetterWords = await prisma.word.findMany({
    where: whereClause,
    orderBy: [{ alphabetLetter: "asc" }, { alphabetOrder: "asc" }],
    select: {
      id: true,
      word: true,
      synonym: true,
      blankQuestions: {
        select: {
          sentence: true,
          blankSentence: true,
          sentence_2: true,
          blankSentence_2: true,
          sentence_3: true,
          blankSentence_3: true,
          sentence_4: true,
          blankSentence_4: true,
          sentence_5: true,
          blankSentence_5: true,
        },
      },
    },
  });

  const wordsWithBlankQuestions = allLetterWords.filter((entry) => entry.blankQuestions.length > 0);
  let selectedWords: typeof wordsWithBlankQuestions;
  if (useRanges && rangeSize !== null && ranges !== null) {
    const wordsFromRanges = ranges.flatMap((offset) =>
      wordsWithBlankQuestions.slice(offset, offset + rangeSize),
    );
    selectedWords = mode === "random" ? shuffle(wordsFromRanges) : wordsFromRanges;
  } else {
    const candidateWords = mode === "random" ? shuffle(wordsWithBlankQuestions) : wordsWithBlankQuestions;
    selectedWords = take ? candidateWords.slice(0, take) : candidateWords;
  }
  const allWordsOnly = allLetterWords.map((entry) => entry.word);
  const satWordMeanings = await getSatWordMeanings();

  const questions: BlankQuizQuestion[] = selectedWords.map((entry) => {
    const selectedPair = pickBlankSentencePair(entry.blankQuestions[0]);
    const currentIndex = allWordsOnly.indexOf(entry.word);
    const wrongChoices = surroundingChoices(allWordsOnly, currentIndex, 3).filter(
      (choice) => choice !== entry.word,
    );

    const choices = shuffle([entry.word, ...wrongChoices].slice(0, 4));

    return {
      wordId: entry.id,
      word: entry.word,
      meaning: entry.synonym.trim() || satWordMeanings.get(entry.word.toLowerCase()) || "Meaning unavailable",
      sentence: selectedPair.sentence,
      sentenceCount: selectedPair.sentenceCount,
      sentenceIndex: selectedPair.sentenceIndex,
      blankSentence: selectedPair.blankSentence,
      choices,
      answer: entry.word,
    };
  });

  return NextResponse.json({
    letters: letterSelection === "all" ? "ALL" : letterSelection,
    count: selectedWords.length,
    allWords: isAllWords,
    questions: shuffle(questions),
  });
}
