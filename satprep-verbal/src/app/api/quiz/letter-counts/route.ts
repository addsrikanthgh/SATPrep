import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeQuizType(rawValue: string | null) {
  const value = (rawValue ?? "meaning").toLowerCase();
  return value === "blank" ? "blank" : "meaning";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quizType = normalizeQuizType(searchParams.get("quizType"));

  const where =
    quizType === "blank"
      ? {
          blankQuestions: {
            some: {},
          },
        }
      : {};

  const grouped = await prisma.word.groupBy({
    by: ["alphabetLetter"],
    where,
    _count: {
      _all: true,
    },
  });

  const counts = Object.fromEntries(
    grouped
      .filter((entry) => /^[A-Z]$/.test(entry.alphabetLetter))
      .map((entry) => [entry.alphabetLetter, entry._count._all]),
  );

  return NextResponse.json({
    quizType,
    counts,
  });
}
