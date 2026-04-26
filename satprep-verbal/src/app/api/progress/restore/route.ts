import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const answerSchema = z.object({
  wordId: z.number().int().positive(),
  isCorrect: z.boolean(),
  createdAt: z.string(),
});

const sessionSchema = z.object({
  quizType: z.enum(["meaning", "blank"]),
  quizNumber: z.number().int().positive(),
  quizName: z.string().min(1),
  alphabetLetter: z.string().min(1),
  questionCount: z.number().int().nonnegative(),
  answeredCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  status: z.string().min(1),
  createdAt: z.string(),
  answers: z.array(answerSchema),
});

const progressSchema = z.object({
  wordId: z.number().int().positive(),
  seenCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  lastResult: z.boolean().nullable(),
  updatedAt: z.string(),
});

const backupSchema = z.object({
  version: z.literal(1),
  studentId: z.string().min(1).optional(), // kept for backward-compat with existing backup files; ignored server-side
  studentProgress: z.array(progressSchema),
  quizSessions: z.array(sessionSchema),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = backupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { studentProgress, quizSessions } = parsed.data;

  // Verify all referenced wordIds exist to prevent orphaned records
  const allWordIds = [
    ...new Set([
      ...studentProgress.map((p) => p.wordId),
      ...quizSessions.flatMap((s) => s.answers.map((a) => a.wordId)),
    ]),
  ];

  if (allWordIds.length > 0) {
    const existingWords = await prisma.word.findMany({
      where: { id: { in: allWordIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingWords.map((w) => w.id));
    const missing = allWordIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Backup references unknown word IDs: ${missing.slice(0, 5).join(", ")}` },
        { status: 422 },
      );
    }
  }

  // Clear existing data first
  const existingSessions = await prisma.quizSession.findMany({
    where: { studentId },
    select: { id: true },
  });
  const existingSessionIds = existingSessions.map((s) => s.id);

  await prisma.$transaction([
    prisma.quizAnswer.deleteMany({ where: { quizSessionId: { in: existingSessionIds } } }),
    prisma.quizSession.deleteMany({ where: { studentId } }),
    prisma.studentProgress.deleteMany({ where: { studentId } }),
  ]);

  // Restore progress rows
  if (studentProgress.length > 0) {
    for (const p of studentProgress) {
      await prisma.studentProgress.upsert({
        where: { studentId_wordId: { studentId, wordId: p.wordId } },
        update: {
          seenCount: p.seenCount,
          correctCount: p.correctCount,
          lastResult: p.lastResult,
          updatedAt: new Date(p.updatedAt),
        },
        create: {
          studentId,
          wordId: p.wordId,
          seenCount: p.seenCount,
          correctCount: p.correctCount,
          lastResult: p.lastResult,
          updatedAt: new Date(p.updatedAt),
        },
      });
    }
  }

  // Restore sessions + answers
  for (const session of quizSessions) {
    const created = await prisma.quizSession.create({
      data: {
        studentId,
        quizType: session.quizType,
        quizNumber: session.quizNumber,
        quizName: session.quizName,
        alphabetLetter: session.alphabetLetter,
        questionCount: session.questionCount,
        answeredCount: session.answeredCount,
        correctCount: session.correctCount,
        status: session.status,
        createdAt: new Date(session.createdAt),
      },
    });

    if (session.answers.length > 0) {
      await prisma.quizAnswer.createMany({
        data: session.answers.map((a) => ({
          quizSessionId: created.id,
          wordId: a.wordId,
          isCorrect: a.isCorrect,
          createdAt: new Date(a.createdAt),
        })),
      });
    }
  }

  return NextResponse.json({
    success: true,
    restored: {
      progressRows: studentProgress.length,
      sessions: quizSessions.length,
    },
  });
}
