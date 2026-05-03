import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toChoiceArray } from "@/lib/csp";

const submitSchema = z.object({
  sessionId: z.number().int().positive(),
  questionId: z.string().min(1),
  selectedAnswer: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = submitSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const userId = authSession.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const quizSession = await tx.cspQuizSession.findUnique({ where: { id: payload.data.sessionId } });
    if (!quizSession || quizSession.userId !== userId) {
      return { status: 404 as const, body: { error: "CSP quiz session not found." } };
    }

    if (quizSession.completedAt) {
      return { status: 400 as const, body: { error: "This session is already completed." } };
    }

    const question = await tx.cspQuestion.findUnique({ where: { id: payload.data.questionId } });
    if (!question) {
      return { status: 404 as const, body: { error: "CSP question not found." } };
    }

    const existingAttempt = await tx.cspQuestionAttempt.findUnique({
      where: {
        sessionId_questionId: {
          sessionId: quizSession.id,
          questionId: question.id,
        },
      },
    });

    if (existingAttempt) {
      return { status: 400 as const, body: { error: "Question already answered in this session." } };
    }

    const isCorrect = payload.data.selectedAnswer === question.correctAnswerIndex;

    const choices = toChoiceArray(question.choices);
    if (payload.data.selectedAnswer >= choices.length) {
      return { status: 400 as const, body: { error: "Selected answer index is out of range." } };
    }

    await tx.cspQuestionAttempt.create({
      data: {
        sessionId: quizSession.id,
        questionId: question.id,
        selectedAnswer: payload.data.selectedAnswer,
        isCorrect,
      },
    });

    const updatedSession = await tx.cspQuizSession.update({
      where: { id: quizSession.id },
      data: {
        score: isCorrect ? { increment: 1 } : undefined,
      },
      select: {
        id: true,
        score: true,
        totalQuestions: true,
        immediateFeedback: true,
      },
    });

    const answeredCount = await tx.cspQuestionAttempt.count({ where: { sessionId: quizSession.id } });
    const completed = answeredCount >= updatedSession.totalQuestions;

    const finalizedSession = completed
      ? await tx.cspQuizSession.update({
          where: { id: quizSession.id },
          data: { completedAt: new Date() },
          select: {
            id: true,
            startedAt: true,
            completedAt: true,
            score: true,
            totalQuestions: true,
            immediateFeedback: true,
            timeLimitSeconds: true,
            unitFilter: true,
          },
        })
      : {
          id: quizSession.id,
          startedAt: quizSession.startedAt,
          completedAt: null,
          score: updatedSession.score,
          totalQuestions: updatedSession.totalQuestions,
          immediateFeedback: updatedSession.immediateFeedback,
          timeLimitSeconds: quizSession.timeLimitSeconds,
          unitFilter: quizSession.unitFilter,
        };

    return {
      status: 200 as const,
      body: {
        result: {
          questionId: question.id,
          selectedAnswer: payload.data.selectedAnswer,
          isCorrect,
          correctAnswerIndex: question.correctAnswerIndex,
          explanation: question.explanation,
          stem: question.stem,
          choices,
        },
        session: {
          ...finalizedSession,
          answeredCount,
          remainingCount: Math.max(0, finalizedSession.totalQuestions - answeredCount),
          completed,
        },
      },
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
