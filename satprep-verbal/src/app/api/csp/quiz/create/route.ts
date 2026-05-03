import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUnit, toChoiceArray } from "@/lib/csp";

const createQuizSchema = z.object({
  unit: z.string().optional().nullable(),
  questionCount: z.number().int().min(1).max(60).default(10).optional(),
  immediateFeedback: z.boolean().default(true).optional(),
  timeLimitSeconds: z.number().int().min(30).max(7200).optional().nullable(),
});

function shuffle<T>(values: T[]) {
  const list = [...values];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createQuizSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const questionCount = payload.data.questionCount ?? 10;
  const unitFilter = normalizeUnit(payload.data.unit);
  const immediateFeedback = payload.data.immediateFeedback ?? true;
  const timeLimitSeconds = payload.data.timeLimitSeconds ?? null;

  const questions = await prisma.cspQuestion.findMany({
    where: unitFilter ? { unit: unitFilter } : undefined,
    select: {
      id: true,
      unit: true,
      stem: true,
      choices: true,
      difficulty: true,
    },
  });

  if (questions.length < questionCount) {
    return NextResponse.json(
      { error: `Not enough questions available for the selected unit. Requested ${questionCount}, found ${questions.length}.` },
      { status: 400 },
    );
  }

  const selected = shuffle(questions).slice(0, questionCount);

  const quizSession = await prisma.cspQuizSession.create({
    data: {
      userId,
      totalQuestions: questionCount,
      unitFilter,
      immediateFeedback,
      timeLimitSeconds,
    },
    select: {
      id: true,
      userId: true,
      startedAt: true,
      completedAt: true,
      score: true,
      totalQuestions: true,
      unitFilter: true,
      immediateFeedback: true,
      timeLimitSeconds: true,
    },
  });

  return NextResponse.json({
    session: quizSession,
    questions: selected.map((question) => ({
      id: question.id,
      unit: question.unit,
      stem: question.stem,
      choices: toChoiceArray(question.choices),
      difficulty: question.difficulty,
    })),
  });
}
