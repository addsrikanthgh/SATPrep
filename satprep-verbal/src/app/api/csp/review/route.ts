import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toChoiceArray } from "@/lib/csp";

const querySchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    sessionId: request.nextUrl.searchParams.get("sessionId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const quizSession = await prisma.cspQuizSession.findFirst({
    where: {
      id: parsed.data.sessionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      score: true,
      totalQuestions: true,
      unitFilter: true,
      immediateFeedback: true,
      timeLimitSeconds: true,
      attempts: {
        orderBy: { answeredAt: "asc" },
        select: {
          questionId: true,
          selectedAnswer: true,
          isCorrect: true,
          answeredAt: true,
          question: {
            select: {
              unit: true,
              stem: true,
              choices: true,
              correctAnswerIndex: true,
              explanation: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: quizSession.id,
      startedAt: quizSession.startedAt,
      completedAt: quizSession.completedAt,
      score: quizSession.score,
      totalQuestions: quizSession.totalQuestions,
      unitFilter: quizSession.unitFilter,
      immediateFeedback: quizSession.immediateFeedback,
      timeLimitSeconds: quizSession.timeLimitSeconds,
      answeredCount: quizSession.attempts.length,
    },
    questions: quizSession.attempts.map((attempt) => ({
      questionId: attempt.questionId,
      answeredAt: attempt.answeredAt,
      selectedAnswer: attempt.selectedAnswer,
      isCorrect: attempt.isCorrect,
      unit: attempt.question.unit,
      stem: attempt.question.stem,
      choices: toChoiceArray(attempt.question.choices),
      correctAnswerIndex: attempt.question.correctAnswerIndex,
      explanation: attempt.question.explanation,
      difficulty: attempt.question.difficulty,
    })),
  });
}
