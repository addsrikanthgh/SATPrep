import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickBlankSentence, pickSentence } from "@/lib/sentences";

type BlankQuizQuestion = {
  wordId: number;
  word: string;
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const letterSelection = parseLetters(searchParams.get("letters") ?? searchParams.get("letter"));
  const countRaw = (searchParams.get("count") ?? "20").toLowerCase();
  const countParsed = Number(countRaw);
  const isAllWords = countRaw === "all";

  const take = isAllWords
    ? undefined
    : Number.isFinite(countParsed) && countParsed > 0
      ? Math.min(countParsed, 1000)
      : 20;

  const letterWhere =
    letterSelection === "all" ? {} : { alphabetLetter: { in: letterSelection } };

  const allLetterWords = await prisma.word.findMany({
    where: letterWhere,
    orderBy: [{ alphabetLetter: "asc" }, { alphabetOrder: "asc" }],
    select: {
      id: true,
      word: true,
      sentence_1: true,
      sentence_2: true,
      sentence_3: true,
      sentence_4: true,
      sentence_5: true,
      blankQuestions: {
        select: {
          blankSentence: true,
          blankSentence_2: true,
          blankSentence_3: true,
          blankSentence_4: true,
          blankSentence_5: true,
        },
      },
    },
  });

  const selectedWords = (take ? allLetterWords.slice(0, take) : allLetterWords).filter(
    (entry) => entry.blankQuestions.length > 0,
  );
  const allWordsOnly = allLetterWords.map((entry) => entry.word);

  const questions: BlankQuizQuestion[] = selectedWords.map((entry) => {
    const selectedSentence = pickSentence(entry);
    const currentIndex = allWordsOnly.indexOf(entry.word);
    const wrongChoices = surroundingChoices(allWordsOnly, currentIndex, 3).filter(
      (choice) => choice !== entry.word,
    );

    const choices = shuffle([entry.word, ...wrongChoices].slice(0, 4));

    return {
      wordId: entry.id,
      word: entry.word,
      sentence: selectedSentence.sentence,
      sentenceCount: selectedSentence.sentenceCount,
      sentenceIndex: selectedSentence.sentenceIndex,
      blankSentence: pickBlankSentence(entry.blankQuestions[0]).blankSentence,
      choices,
      answer: entry.word,
    };
  });

  return NextResponse.json({
    letters: letterSelection === "all" ? "ALL" : letterSelection,
    count: take ?? questions.length,
    allWords: isAllWords,
    questions: shuffle(questions),
  });
}
