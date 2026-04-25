import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfiguredSentences } from "@/lib/sentences";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") ?? "local-default-student";

  const rows = await prisma.studentProgress.findMany({
    where: {
      studentId,
      seenCount: { gt: 0 },
    },
    include: {
      word: {
        select: {
          id: true,
          word: true,
          partOfSpeech: true,
          synonym: true,
          sentence_1: true,
          sentence_2: true,
          sentence_3: true,
          sentence_4: true,
          sentence_5: true,
          alphabetLetter: true,
          alphabetOrder: true,
        },
      },
    },
  });

  const weakWords = rows
    .map((row) => {
      const incorrectCount = row.seenCount - row.correctCount;
      const accuracy = row.seenCount > 0 ? row.correctCount / row.seenCount : 0;
      const configuredSentences = getConfiguredSentences(row.word);

      return {
        wordId: row.wordId,
        word: row.word.word,
        partOfSpeech: row.word.partOfSpeech,
        meaning: row.word.synonym,
        sentence: configuredSentences[0] ?? "",
        sentenceCount: configuredSentences.length,
        alphabetLetter: row.word.alphabetLetter,
        alphabetOrder: row.word.alphabetOrder,
        seenCount: row.seenCount,
        correctCount: row.correctCount,
        incorrectCount,
        accuracy,
        lastResult: row.lastResult,
        updatedAt: row.updatedAt,
      };
    })
    .filter((row) => row.incorrectCount > 0)
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });

  return NextResponse.json({ studentId, weakWords });
}
