import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

  const quizTypeParam = (url.searchParams.get("quizType") ?? "all").toLowerCase();
  const quizTypeFilter = quizTypeParam === "meaning" || quizTypeParam === "blank" ? quizTypeParam : undefined;

  const letterParam = (url.searchParams.get("letter") ?? "all").toUpperCase();
  const letterFilter = /^[A-Z]$/.test(letterParam) ? letterParam : undefined;

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const fromDate = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : undefined;
  const toDate = toParam ? new Date(`${toParam}T23:59:59.999Z`) : undefined;

  const whereClause = {
    studentId,
    ...(quizTypeFilter ? { quizType: quizTypeFilter } : {}),
    ...(letterFilter ? { alphabetLetter: letterFilter } : {}),
    ...((fromDate || toDate)
      ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
      : {}),
  };

  const sessions = await prisma.quizSession.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, quizType: true, quizNumber: true, quizName: true,
      alphabetLetter: true, questionCount: true, answeredCount: true,
      correctCount: true, status: true, createdAt: true,
    },
  });

  const sessionIds = sessions.map((s) => s.id);

  const [totalWordsInBank, allProgressRows, wordsByLetterRows] = await Promise.all([
    prisma.word.count(),
    prisma.studentProgress.findMany({
      where: { studentId },
      select: { seenCount: true, correctCount: true, word: { select: { alphabetLetter: true } } },
    }),
    prisma.word.groupBy({
      by: ["alphabetLetter"],
      _count: { _all: true },
      where: { alphabetLetter: { in: LETTERS } },
    }),
  ]);

  const wordsByLetter = new Map(wordsByLetterRows.map((row) => [row.alphabetLetter, row._count._all]));

  const wordIds =
    sessionIds.length > 0
      ? (
          await prisma.quizAnswer.findMany({
            where: { quizSessionId: { in: sessionIds } },
            select: { wordId: true },
            distinct: ["wordId"],
          })
        ).map((row) => row.wordId)
      : [];

  const progressRows =
    wordIds.length > 0
      ? await prisma.studentProgress.findMany({
          where: { studentId, wordId: { in: wordIds } },
          select: { seenCount: true, correctCount: true },
        })
      : [];

  const allWordsMastery = allProgressRows.reduce(
    (acc, row) => {
      const accuracy = row.seenCount > 0 ? row.correctCount / row.seenCount : 0;
      if (row.seenCount > 0) acc.wordsSeen += 1;
      if (row.seenCount >= 2 && accuracy >= 0.8) acc.masteredWords += 1;
      return acc;
    },
    { wordsSeen: 0, masteredWords: 0 },
  );

  const masteryByLetterSeed = LETTERS.map((letter) => ({
    letter, totalWords: wordsByLetter.get(letter) ?? 0,
    wordsSeen: 0, masteredWords: 0, coveragePercent: 0, masteryPercent: 0,
  }));
  const masteryByLetterMap = new Map(masteryByLetterSeed.map((row) => [row.letter, row]));

  for (const row of allProgressRows) {
    const letter = row.word.alphabetLetter;
    if (!/^[A-Z]$/.test(letter)) continue;
    const lr = masteryByLetterMap.get(letter);
    if (!lr) continue;
    const accuracy = row.seenCount > 0 ? row.correctCount / row.seenCount : 0;
    if (row.seenCount > 0) lr.wordsSeen += 1;
    if (row.seenCount >= 2 && accuracy >= 0.8) lr.masteredWords += 1;
  }

  const masteryByLetter = masteryByLetterSeed
    .map((row) => ({
      ...row,
      coveragePercent: row.totalWords > 0 ? row.wordsSeen / row.totalWords : 0,
      masteryPercent: row.totalWords > 0 ? row.masteredWords / row.totalWords : 0,
    }))
    .filter((row) => row.totalWords > 0);

  const summary = sessions.reduce(
    (acc, s) => {
      const key = s.quizType === "blank" ? "blank" : "meaning";
      acc.totalSessions += 1;
      acc.totalAnswered += s.answeredCount;
      acc.totalCorrect += s.correctCount;
      acc.byType[key].sessions += 1;
      acc.byType[key].answered += s.answeredCount;
      acc.byType[key].correct += s.correctCount;
      if (s.status === "completed") acc.completedSessions += 1;
      return acc;
    },
    {
      totalSessions: 0, completedSessions: 0, totalAnswered: 0, totalCorrect: 0,
      byType: {
        meaning: { sessions: 0, answered: 0, correct: 0 },
        blank: { sessions: 0, answered: 0, correct: 0 },
      },
    },
  );

  const progressTotals = progressRows.reduce(
    (acc, row) => {
      acc.wordsTracked += 1;
      acc.totalSeen += row.seenCount;
      acc.totalCorrect += row.correctCount;
      if (row.seenCount - row.correctCount > 0) acc.weakWords += 1;
      if (row.seenCount > 0 && row.seenCount === row.correctCount) acc.perfectWords += 1;
      return acc;
    },
    { wordsTracked: 0, weakWords: 0, perfectWords: 0, totalSeen: 0, totalCorrect: 0 },
  );

  return NextResponse.json({
    summary: {
      ...summary,
      overallAccuracy: summary.totalAnswered > 0 ? summary.totalCorrect / summary.totalAnswered : 0,
      byType: {
        meaning: {
          ...summary.byType.meaning,
          accuracy: summary.byType.meaning.answered > 0
            ? summary.byType.meaning.correct / summary.byType.meaning.answered : 0,
        },
        blank: {
          ...summary.byType.blank,
          accuracy: summary.byType.blank.answered > 0
            ? summary.byType.blank.correct / summary.byType.blank.answered : 0,
        },
      },
    },
    wordProgress: {
      ...progressTotals,
      overallAccuracy: progressTotals.totalSeen > 0 ? progressTotals.totalCorrect / progressTotals.totalSeen : 0,
    },
    allWordsMastery: {
      totalWordsInBank,
      wordsSeen: allWordsMastery.wordsSeen,
      masteredWords: allWordsMastery.masteredWords,
      coveragePercent: totalWordsInBank > 0 ? allWordsMastery.wordsSeen / totalWordsInBank : 0,
      masteryPercentOfAllWords: totalWordsInBank > 0 ? allWordsMastery.masteredWords / totalWordsInBank : 0,
      masteryPercentOfSeenWords:
        allWordsMastery.wordsSeen > 0 ? allWordsMastery.masteredWords / allWordsMastery.wordsSeen : 0,
      masteryRule: "Mastered = seen at least 2 times and accuracy at least 80%",
    },
    masteryByLetter,
    filters: {
      quizType: quizTypeFilter ?? "all",
      letter: letterFilter ?? "all",
      from: fromParam ?? "",
      to: toParam ?? "",
    },
    sessions,
  });
}
