import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const wordId = Number(id);

  if (!Number.isInteger(wordId)) {
    return NextResponse.json({ error: "Invalid word id" }, { status: 400 });
  }

  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: { blankQuestions: true },
  });

  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  return NextResponse.json(word);
}
