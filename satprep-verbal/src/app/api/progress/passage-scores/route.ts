import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  const [quizSessions, progressRows] = await Promise.all([
    prisma.passageQuizSession.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        quizNumber: true,
        quizName: true,
        questionCount: true,
        answeredCount: true,
        correctCount: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.studentPassageProgress.findMany({
      where: { studentId },
      select: {
        domain: true,
        skill: true,
        attemptCount: true,
        correctCount: true,
      },
      orderBy: [{ domain: "asc" }, { skill: "asc" }],
    }),
  ]);

  const summary = quizSessions.reduce(
    (acc, row) => {
      acc.totalQuizzes += 1;
      acc.completedQuizzes += row.status === "completed" ? 1 : 0;
      acc.answered += row.answeredCount;
      acc.correct += row.correctCount;
      return acc;
    },
    {
      totalQuizzes: 0,
      completedQuizzes: 0,
      answered: 0,
      correct: 0,
    },
  );

  const domainMap = new Map<string, { attempts: number; correct: number }>();
  const skillMap = new Map<string, { attempts: number; correct: number }>();

  for (const row of progressRows) {
    const domainRow = domainMap.get(row.domain) ?? { attempts: 0, correct: 0 };
    domainRow.attempts += row.attemptCount;
    domainRow.correct += row.correctCount;
    domainMap.set(row.domain, domainRow);

    const skillKey = `${row.domain}::${row.skill}`;
    const skillRow = skillMap.get(skillKey) ?? { attempts: 0, correct: 0 };
    skillRow.attempts += row.attemptCount;
    skillRow.correct += row.correctCount;
    skillMap.set(skillKey, skillRow);
  }

  const byDomain = [...domainMap.entries()].map(([domain, values]) => ({
    domain,
    attempts: values.attempts,
    correct: values.correct,
    accuracy: values.attempts > 0 ? values.correct / values.attempts : 0,
  }));

  const bySkill = [...skillMap.entries()].map(([key, values]) => {
    const [domain, skill] = key.split("::");
    return {
      domain,
      skill,
      attempts: values.attempts,
      correct: values.correct,
      accuracy: values.attempts > 0 ? values.correct / values.attempts : 0,
    };
  });

  return NextResponse.json({
    summary: {
      ...summary,
      overallAccuracy: summary.answered > 0 ? summary.correct / summary.answered : 0,
    },
    byDomain,
    bySkill,
    sessions: quizSessions,
  });
}
