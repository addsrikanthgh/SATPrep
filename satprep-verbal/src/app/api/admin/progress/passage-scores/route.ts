import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

function verifyPasscode(provided: string): boolean {
  if (!ADMIN_IMPORT_PASSCODE) return false;
  try {
    const expected = Buffer.from(ADMIN_IMPORT_PASSCODE, "utf8");
    const actual = Buffer.from(provided, "utf8");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_IMPORT_PASSCODE) {
    return NextResponse.json({ error: "Admin access is not configured on this server." }, { status: 503 });
  }

  const passcode = request.headers.get("x-admin-passcode") ?? "";
  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 403 });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId") ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  const [quizSessions, progressRows] = await Promise.all([
    prisma.passageQuizSession.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, quizNumber: true, quizName: true,
        questionCount: true, answeredCount: true, correctCount: true,
        status: true, createdAt: true,
      },
    }),
    prisma.studentPassageProgress.findMany({
      where: { studentId },
      select: { domain: true, skill: true, attemptCount: true, correctCount: true },
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
    { totalQuizzes: 0, completedQuizzes: 0, answered: 0, correct: 0 },
  );

  const domainMap = new Map<string, { attempts: number; correct: number }>();
  const skillMap = new Map<string, { attempts: number; correct: number }>();

  for (const row of progressRows) {
    const dr = domainMap.get(row.domain) ?? { attempts: 0, correct: 0 };
    dr.attempts += row.attemptCount;
    dr.correct += row.correctCount;
    domainMap.set(row.domain, dr);

    const skillKey = `${row.domain}::${row.skill}`;
    const sr = skillMap.get(skillKey) ?? { attempts: 0, correct: 0 };
    sr.attempts += row.attemptCount;
    sr.correct += row.correctCount;
    skillMap.set(skillKey, sr);
  }

  const byDomain = [...domainMap.entries()].map(([domain, v]) => ({
    domain, attempts: v.attempts, correct: v.correct,
    accuracy: v.attempts > 0 ? v.correct / v.attempts : 0,
  }));

  const bySkill = [...skillMap.entries()].map(([key, v]) => {
    const [domain, skill] = key.split("::");
    return {
      domain, skill, attempts: v.attempts, correct: v.correct,
      accuracy: v.attempts > 0 ? v.correct / v.attempts : 0,
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
