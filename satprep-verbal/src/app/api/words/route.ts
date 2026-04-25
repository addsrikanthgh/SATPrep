import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickSentence } from "@/lib/sentences";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const letter = (searchParams.get("letter") ?? "A").toUpperCase();
  const batch = Number(searchParams.get("batch") ?? "10");

  const take = Number.isFinite(batch) && batch > 0 ? Math.min(batch, 100) : 10;

  const words = await prisma.word.findMany({
    where: { alphabetLetter: letter },
    orderBy: { alphabetOrder: "asc" },
    take,
    include: {
      blankQuestions: {
        select: {
          blankSentence: true,
        },
      },
    },
  });

  const hydratedWords = words.map((word) => {
    const selected = pickSentence(word);
    return {
      ...word,
      sentence: selected.sentence,
      sentenceCount: selected.sentenceCount,
      sentenceIndex: selected.sentenceIndex,
    };
  });

  return NextResponse.json({ letter, batch: take, words: hydratedWords });
}
