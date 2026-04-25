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
      version: entry.version,
      updatedAt: entry.updatedAt,
      questionCount: entry._count.questions,
    })),
  );
}
