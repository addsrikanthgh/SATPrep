import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;
  const url = new URL(request.url);
  const correctFilter = url.searchParams.get("correct");
  const domainFilter = url.searchParams.get("domain");
  const skillFilter = url.searchParams.get("skill");
  const passageQuizSessionIdParam = url.searchParams.get("passageQuizSessionId");
  const passageQuizSessionId = passageQuizSessionIdParam ? Number.parseInt(passageQuizSessionIdParam, 10) : null;

  const answers = await prisma.passageQuizAnswer.findMany({
    where: {
      session: {
        studentId,
        ...(Number.isFinite(passageQuizSessionId) && (passageQuizSessionId ?? 0) > 0
          ? { id: passageQuizSessionId as number }
          : {}),
      },
    },
    select: {
      passageSetId: true,
      questionId: true,
      domain: true,
      skill: true,
      selectedAnswer: true,
      correctAnswer: true,
      isCorrect: true,
      createdAt: true,
      passageSet: {
        select: {
          id: true,
          title: true,
          passage: true,
          difficulty: true,
          questions: {
            select: {
              questionId: true,
              questionType: true,
              questionText: true,
              choiceA: true,
              choiceB: true,
              choiceC: true,
              choiceD: true,
              correctAnswer: true,
              explanation: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter by correctness if requested
  let filtered = answers;
  if (correctFilter === "correct") {
    filtered = answers.filter((a) => a.isCorrect);
  } else if (correctFilter === "incorrect") {
    filtered = answers.filter((a) => !a.isCorrect);
  }

  // Extract available domains and skills from all answers
  const availableDomains = Array.from(new Set(answers.map((a) => a.domain))).sort();
  const availableSkills = Array.from(new Set(answers.map((a) => a.skill))).sort();

  // Apply domain and skill filters
  if (domainFilter && domainFilter !== "all") {
    filtered = filtered.filter((a) => a.domain === domainFilter);
  }
  if (skillFilter && skillFilter !== "all") {
    filtered = filtered.filter((a) => a.skill === skillFilter);
  }

  // Group by passage
  const passageMap = new Map<
    string,
    {
      passageSetId: string;
      title: string;
      passage: string;
      difficulty: string;
      domain: string;
      skill: string;
      isCorrect: boolean;
      createdAt: Date;
      questions: Array<{
        questionId: string;
        questionType: string;
        questionText: string;
        choiceA: string;
        choiceB: string;
        choiceC: string;
        choiceD: string;
        correctAnswer: string;
        explanation: string;
        selectedAnswer: string;
        isCorrect: boolean;
      }>;
    }
  >();

  for (const answer of filtered) {
    const key = answer.passageSetId;
    if (!passageMap.has(key)) {
      passageMap.set(key, {
        passageSetId: answer.passageSetId,
        title: answer.passageSet.title ?? `Passage ${answer.passageSetId}`,
        passage: answer.passageSet.passage,
        difficulty: answer.passageSet.difficulty,
        domain: answer.domain,
        skill: answer.skill,
        isCorrect: answer.isCorrect,
        createdAt: answer.createdAt,
        questions: [],
      });
    }

    const entry = passageMap.get(key)!;
    const question = answer.passageSet.questions.find((q) => q.questionId === answer.questionId);
    if (question) {
      entry.questions.push({
        questionId: answer.questionId,
        questionType: question.questionType,
        questionText: question.questionText,
        choiceA: question.choiceA,
        choiceB: question.choiceB,
        choiceC: question.choiceC,
        choiceD: question.choiceD,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
      });
    }
  }

  const passages = Array.from(passageMap.values());

  return NextResponse.json({
    passages,
    filters: {
      domains: availableDomains,
      skills: availableSkills,
    },
  });
}
