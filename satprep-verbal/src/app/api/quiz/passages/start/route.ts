import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPassageQuizNumber } from "@/lib/passage-quiz";

const startSchema = z.object({
  questionCount: z.number().int().positive().max(100).default(10).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  const parsed = startSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const questionCount = parsed.data.questionCount ?? 10;
  const quizNumber = await getPassageQuizNumber(prisma, studentId);
  const quizName = `P-Q${quizNumber}-MIXED-${questionCount}`;

  const created = await prisma.passageQuizSession.create({
    data: {
      studentId,
      quizNumber,
      quizName,
      questionCount,
      status: "in_progress",
    },
  });

  return NextResponse.json(created);
}
