import type { PrismaClient } from "@prisma/client";

type NextPassageOptions = {
  prisma: PrismaClient;
  studentId: string;
  passageQuizSessionId: number;
  filterDomain?: string | null;
  filterSkill?: string | null;
};

export async function getNextPassageQuestionForSession(options: NextPassageOptions) {
  const { prisma, studentId, passageQuizSessionId, filterDomain, filterSkill } = options;

  const [answeredRows, readStates] = await Promise.all([
    prisma.passageQuizAnswer.findMany({
      where: { passageQuizSessionId },
      select: { passageSetId: true },
    }),
    prisma.passageReadState.findMany({
      where: { studentId },
      select: { passageSetId: true },
    }),
  ]);

  const answeredIds = new Set(answeredRows.map((row) => row.passageSetId));
  const readIds = new Set(readStates.map((row) => row.passageSetId));

  const candidates = await prisma.passageSet.findMany({
    where: {
      id: {
        notIn: [...answeredIds],
      },
      ...(filterDomain ? { domain: filterDomain } : {}),
      ...(filterSkill ? { skill: filterSkill } : {}),
    },
    include: {
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
          visualId: true,
        },
        orderBy: { questionId: "asc" },
        take: 1,
      },
    },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
  });

  const withQuestion = candidates.filter((entry) => entry.questions.length > 0);

  if (withQuestion.length === 0) {
    return null;
  }

  const unseen = withQuestion.find((entry) => !readIds.has(entry.id));
  const selected = unseen ?? withQuestion[0];
  const question = selected.questions[0];

  const alreadyRead = readIds.has(selected.id);

  if (!alreadyRead) {
    await prisma.passageReadState.upsert({
      where: {
        studentId_passageSetId: {
          studentId,
          passageSetId: selected.id,
        },
      },
      update: {},
      create: {
        studentId,
        passageSetId: selected.id,
      },
    });
  }

  return {
    passageSet: selected,
    question,
    alreadyRead,
    passageText: alreadyRead ? null : selected.passage,
  };
}

export async function getPassageQuizNumber(prisma: PrismaClient, studentId: string) {
  const latest = await prisma.passageQuizSession.findFirst({
    where: { studentId },
    orderBy: { quizNumber: "desc" },
    select: { quizNumber: true },
  });

  return (latest?.quizNumber ?? 0) + 1;
}
