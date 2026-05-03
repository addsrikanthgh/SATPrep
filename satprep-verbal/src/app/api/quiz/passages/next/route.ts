import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNextPassageQuestionForSession } from "@/lib/passage-quiz";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;
  const sessionIdRaw = request.nextUrl.searchParams.get("passageQuizSessionId");
  const sessionId = Number.parseInt(sessionIdRaw ?? "", 10);

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "passageQuizSessionId is required." }, { status: 400 });
  }

  const quizSession = await prisma.passageQuizSession.findUnique({ where: { id: sessionId } });
  if (!quizSession || quizSession.studentId !== studentId) {
    return NextResponse.json({ error: "Passage quiz session not found." }, { status: 404 });
  }

  if (quizSession.status === "completed") {
    return NextResponse.json({ done: true, session: quizSession });
  }

  const next = await getNextPassageQuestionForSession({
    prisma,
    studentId,
    passageQuizSessionId: sessionId,
    filterDomain: quizSession.filterDomain,
    filterSkill: quizSession.filterSkill,
    dsatStyle: quizSession.quizName.includes("-DSAT-"),
  });

  if (!next) {
    const completedSession = await prisma.passageQuizSession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    return NextResponse.json({ done: true, session: completedSession });
  }

  return NextResponse.json({
    done: false,
    session: quizSession,
    item: {
      passageSetId: next.passageSet.id,
      domain: next.passageSet.domain,
      skill: next.passageSet.skill,
      difficulty: next.passageSet.difficulty,
      questionId: next.question.questionId,
      questionType: next.question.questionType,
      visualId: next.question.visualId,
      question: next.question.questionText,
      choices: {
        A: next.question.choiceA,
        B: next.question.choiceB,
        C: next.question.choiceC,
        D: next.question.choiceD,
      },
      passage: next.passageText,
      alreadyRead: next.alreadyRead,
      readPolicy: next.alreadyRead
        ? "You have already read this passage. Retry in question-only mode."
        : "First read unlocked. This passage will be hidden on future attempts.",
    },
  });
}
