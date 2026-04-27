import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sets = await prisma.passageSet.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  return NextResponse.json(
    sets.map((entry) => ({
      id: entry.id,
      title: entry.title,
      domain: entry.domain,
      skill: entry.skill,
      difficulty: entry.difficulty,
      sequence: entry.sequence,
      version: entry.version,
      updatedAt: entry.updatedAt,
      questionCount: entry._count.questions,
    })),
  );
}
