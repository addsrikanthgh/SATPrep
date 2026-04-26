import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId = session.user.id;

  const [progressRows, sessions] = await Promise.all([
    prisma.studentProgress.findMany({
      where: { studentId },
      include: { word: { select: { word: true } } },
    }),
    prisma.quizSession.findMany({
      where: { studentId },
      include: { answers: true },
    }),
  ]);

  const backup = {
    version: 1,
    studentId,
    exportedAt: new Date().toISOString(),
    studentProgress: progressRows.map((r) => ({
      wordId: r.wordId,
      wordText: r.word.word,
      seenCount: r.seenCount,
      correctCount: r.correctCount,
      lastResult: r.lastResult,
      updatedAt: r.updatedAt.toISOString(),
    })),
    quizSessions: sessions.map((s) => ({
      id: s.id,
      quizType: s.quizType,
      quizNumber: s.quizNumber,
      quizName: s.quizName,
      alphabetLetter: s.alphabetLetter,
      questionCount: s.questionCount,
      answeredCount: s.answeredCount,
      correctCount: s.correctCount,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      answers: s.answers.map((a) => ({
        wordId: a.wordId,
        isCorrect: a.isCorrect,
        createdAt: a.createdAt.toISOString(),
      })),
    })),
  };

  return NextResponse.json(backup);
}
