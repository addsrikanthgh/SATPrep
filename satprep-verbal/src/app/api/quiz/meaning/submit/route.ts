import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  studentId: z.string().min(1).optional(),
  wordId: z.number().int().positive(),
  isCorrect: z.boolean(),
  quizSessionId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const payload = submitSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const studentId = payload.data.studentId ?? "local-default-student";

  const result = await prisma.$transaction(async (tx) => {
    const progress = await tx.studentProgress.upsert({
      where: {
        studentId_wordId: {
          studentId,
          wordId: payload.data.wordId,
        },
      },
      update: {
        seenCount: { increment: 1 },
        correctCount: payload.data.isCorrect ? { increment: 1 } : undefined,
        lastResult: payload.data.isCorrect,
      },
      create: {
        studentId,
        wordId: payload.data.wordId,
        seenCount: 1,
        correctCount: payload.data.isCorrect ? 1 : 0,
        lastResult: payload.data.isCorrect,
      },
    });

    let session = null;

    if (payload.data.quizSessionId) {
      const existing = await tx.quizAnswer.findUnique({
        where: {
          quizSessionId_wordId: {
            quizSessionId: payload.data.quizSessionId,
            wordId: payload.data.wordId,
          },
        },
      });

      if (!existing) {
        await tx.quizAnswer.create({
          data: {
            quizSessionId: payload.data.quizSessionId,
            wordId: payload.data.wordId,
            isCorrect: payload.data.isCorrect,
          },
        });

        await tx.quizSession.update({
          where: { id: payload.data.quizSessionId },
          data: {
            answeredCount: { increment: 1 },
            correctCount: payload.data.isCorrect ? { increment: 1 } : undefined,
          },
        });
      }

      session = await tx.quizSession.findUnique({ where: { id: payload.data.quizSessionId } });

      if (session && session.answeredCount >= session.questionCount && session.status !== "completed") {
        session = await tx.quizSession.update({
          where: { id: payload.data.quizSessionId },
          data: { status: "completed" },
        });
      }
    }

    return { progress, session };
  });

  return NextResponse.json(result);
}
