import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  passageQuizSessionId: z.number().int().positive(),
  passageSetId: z.string().min(1),
  questionId: z.string().min(1),
  selectedAnswer: z.enum(["A", "B", "C", "D"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;
  const parsed = submitSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  const quizSession = await prisma.passageQuizSession.findUnique({
    where: { id: payload.passageQuizSessionId },
  });

  if (!quizSession || quizSession.studentId !== studentId) {
    return NextResponse.json({ error: "Passage quiz session not found." }, { status: 404 });
  }

  const question = await prisma.passageQuestion.findFirst({
    where: {
      passageSetId: payload.passageSetId,
      questionId: payload.questionId,
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Passage question not found." }, { status: 404 });
  }

  const set = await prisma.passageSet.findUnique({ where: { id: payload.passageSetId } });
  if (!set) {
    return NextResponse.json({ error: "Passage not found." }, { status: 404 });
  }

  const isCorrect = payload.selectedAnswer === question.correctAnswer;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.passageQuizAnswer.findUnique({
      where: {
        passageQuizSessionId_passageSetId: {
          passageQuizSessionId: payload.passageQuizSessionId,
          passageSetId: payload.passageSetId,
        },
      },
    });

    let answerRow = existing;

    if (!existing) {
      await tx.passageQuizAnswer.create({
        data: {
          passageQuizSessionId: payload.passageQuizSessionId,
          passageSetId: payload.passageSetId,
          questionId: payload.questionId,
          domain: set.domain,
          skill: set.skill,
          selectedAnswer: payload.selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
        },
      });

      answerRow = await tx.passageQuizAnswer.findUnique({
        where: {
          passageQuizSessionId_passageSetId: {
            passageQuizSessionId: payload.passageQuizSessionId,
            passageSetId: payload.passageSetId,
          },
        },
      });

      await tx.passageQuizSession.update({
        where: { id: payload.passageQuizSessionId },
        data: {
          answeredCount: { increment: 1 },
          correctCount: isCorrect ? { increment: 1 } : undefined,
        },
      });

      await tx.studentPassageProgress.upsert({
        where: {
          studentId_domain_skill: {
            studentId,
            domain: set.domain,
            skill: set.skill,
          },
        },
        update: {
          attemptCount: { increment: 1 },
          correctCount: isCorrect ? { increment: 1 } : undefined,
        },
        create: {
          studentId,
          domain: set.domain,
          skill: set.skill,
          attemptCount: 1,
          correctCount: isCorrect ? 1 : 0,
        },
      });
    }

    let updatedSession = await tx.passageQuizSession.findUnique({
      where: { id: payload.passageQuizSessionId },
    });

    if (
      updatedSession &&
      updatedSession.answeredCount >= updatedSession.questionCount &&
      updatedSession.status !== "completed"
    ) {
      updatedSession = await tx.passageQuizSession.update({
        where: { id: payload.passageQuizSessionId },
        data: { status: "completed" },
      });
    }

    return { updatedSession, answerRow };
  });

  const resolvedCorrectAnswer = result.answerRow?.correctAnswer ?? question.correctAnswer;
  const resolvedSelectedAnswer =
    (result.answerRow?.selectedAnswer as "A" | "B" | "C" | "D" | undefined) ?? payload.selectedAnswer;
  const resolvedIsCorrect = result.answerRow?.isCorrect ?? isCorrect;

  return NextResponse.json({
    session: result.updatedSession,
    feedback: {
      isCorrect: resolvedIsCorrect,
      selectedAnswer: resolvedSelectedAnswer,
      correctAnswer: resolvedCorrectAnswer,
      explanation: question.explanation,
    },
  });
}
