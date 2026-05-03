import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const unitParam = request.nextUrl.searchParams.get("unit");
  const unitFilter = unitParam && unitParam.toLowerCase() !== "all" ? unitParam : null;

  const [quizSessions, attempts] = await Promise.all([
    prisma.cspQuizSession.findMany({
      where: {
        userId,
        ...(unitFilter ? { unitFilter } : {}),
      },
      orderBy: { startedAt: "desc" },
      take: 100,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        score: true,
        totalQuestions: true,
        unitFilter: true,
        immediateFeedback: true,
      },
    }),
    prisma.cspQuestionAttempt.findMany({
      where: {
        session: {
          userId,
          ...(unitFilter ? { unitFilter } : {}),
        },
      },
      orderBy: { answeredAt: "desc" },
      take: 500,
      select: {
        sessionId: true,
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
          },
        },
      },
    }),
  ]);

  const byUnitMap = new Map<string, { attempts: number; correct: number }>();

  for (const attempt of attempts) {
    const unit = attempt.question.unit;
    const row = byUnitMap.get(unit) ?? { attempts: 0, correct: 0 };
    row.attempts += 1;
    row.correct += attempt.isCorrect ? 1 : 0;
    byUnitMap.set(unit, row);
  }

  const byUnit = [...byUnitMap.entries()]
    .map(([unit, value]) => ({
      unit,
      attempts: value.attempts,
      correct: value.correct,
      accuracy: value.attempts > 0 ? value.correct / value.attempts : 0,
    }))
    .sort((a, b) => a.unit.localeCompare(b.unit));

  const incorrectAnswers = attempts
    .filter((attempt) => !attempt.isCorrect)
    .slice(0, 50)
    .map((attempt) => ({
      sessionId: attempt.sessionId,
      questionId: attempt.questionId,
      answeredAt: attempt.answeredAt,
      unit: attempt.question.unit,
      stem: attempt.question.stem,
      choices: attempt.question.choices,
      selectedAnswer: attempt.selectedAnswer,
      correctAnswerIndex: attempt.question.correctAnswerIndex,
      explanation: attempt.question.explanation,
    }));

  const summary = quizSessions.reduce(
    (acc, row) => {
      acc.totalSessions += 1;
      acc.completedSessions += row.completedAt ? 1 : 0;
      acc.totalScore += row.score;
      acc.totalQuestions += row.totalQuestions;
      return acc;
    },
    {
      totalSessions: 0,
      completedSessions: 0,
      totalScore: 0,
      totalQuestions: 0,
    },
  );

  return NextResponse.json({
    summary: {
      ...summary,
      overallAccuracy: summary.totalQuestions > 0 ? summary.totalScore / summary.totalQuestions : 0,
    },
    byUnit,
    sessions: quizSessions,
    incorrectAnswers,
  });
}
