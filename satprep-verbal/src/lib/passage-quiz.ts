import type { PrismaClient } from "@prisma/client";

type NextPassageOptions = {
  prisma: PrismaClient;
  studentId: string;
  passageQuizSessionId: number;
  filterDomain?: string | null;
  filterSkill?: string | null;
  dsatStyle?: boolean;
};

type CandidateWithQuestion = {
  id: string;
  sequence: number | null;
  passage: string;
  title: string | null;
  domain: string;
  skill: string;
  difficulty: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  sourceWords: string;
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
    visualId: string | null;
  }>;
};

const DSAT_TOTAL_QUESTIONS = 27;
const DSAT_DOMAIN_TARGETS = {
  informationAndIdeas: 7,
  expressionOfIdeas: 5,
  craftAndStructure: 8,
  standardEnglishConventions: 7,
} as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isInfoAndIdeasDomain(domain: string) {
  const d = normalizeText(domain);
  return d === "information and ideas";
}

function isStandardEnglishConventionsDomain(domain: string) {
  const d = normalizeText(domain);
  return d === "standard english conventions";
}

function isCraftAndStructureDomain(domain: string) {
  const d = normalizeText(domain);
  return d === "craft and structure";
}

function isExpressionOfIdeasDomain(domain: string) {
  const d = normalizeText(domain);
  return d === "expression of ideas";
}

function pickRandom<T>(items: T[]) {
  if (items.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

function chooseDsatCandidate(
  candidates: CandidateWithQuestion[],
  answeredRows: Array<{ passageSetId: string; domain: string }>,
  readIds: Set<string>,
) {
  const answeredCount = answeredRows.length;
  if (answeredCount >= DSAT_TOTAL_QUESTIONS) {
    return null;
  }

  const domainCounts = {
    informationAndIdeas: answeredRows.filter((row) => isInfoAndIdeasDomain(row.domain)).length,
    expressionOfIdeas: answeredRows.filter((row) => isExpressionOfIdeasDomain(row.domain)).length,
    craftAndStructure: answeredRows.filter((row) => isCraftAndStructureDomain(row.domain)).length,
    standardEnglishConventions: answeredRows.filter((row) => isStandardEnglishConventionsDomain(row.domain)).length,
  };

  const orderedPhases = [
    {
      remaining: DSAT_DOMAIN_TARGETS.informationAndIdeas - domainCounts.informationAndIdeas,
      filter: (entry: CandidateWithQuestion) => isInfoAndIdeasDomain(entry.domain),
    },
    {
      remaining: DSAT_DOMAIN_TARGETS.expressionOfIdeas - domainCounts.expressionOfIdeas,
      filter: (entry: CandidateWithQuestion) => isExpressionOfIdeasDomain(entry.domain),
    },
    {
      remaining: DSAT_DOMAIN_TARGETS.craftAndStructure - domainCounts.craftAndStructure,
      filter: (entry: CandidateWithQuestion) => isCraftAndStructureDomain(entry.domain),
    },
    {
      remaining:
        DSAT_DOMAIN_TARGETS.standardEnglishConventions - domainCounts.standardEnglishConventions,
      filter: (entry: CandidateWithQuestion) => isStandardEnglishConventionsDomain(entry.domain),
    },
  ];

  // Enforce presentation order by taking the first phase with remaining target.
  let candidatePool: CandidateWithQuestion[] = candidates;
  const activePhaseIndex = orderedPhases.findIndex((phase) => phase.remaining > 0);

  if (activePhaseIndex >= 0) {
    for (let index = activePhaseIndex; index < orderedPhases.length; index += 1) {
      const phase = orderedPhases[index];
      if (phase.remaining <= 0) {
        continue;
      }

      const phaseCandidates = candidates.filter(phase.filter);
      if (phaseCandidates.length > 0) {
        candidatePool = phaseCandidates;
        break;
      }
    }
  }

  const unseenPool = candidatePool.filter((entry) => !readIds.has(entry.id));
  const prioritizedPool = unseenPool.length > 0 ? unseenPool : candidatePool;

  return pickRandom(prioritizedPool);
}

export async function getNextPassageQuestionForSession(options: NextPassageOptions) {
  const { prisma, studentId, passageQuizSessionId, filterDomain, filterSkill, dsatStyle = false } = options;

  const [answeredRows, readStates] = await Promise.all([
    prisma.passageQuizAnswer.findMany({
      where: { passageQuizSessionId },
      select: { passageSetId: true, domain: true },
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

  const selected = dsatStyle
    ? chooseDsatCandidate(withQuestion as CandidateWithQuestion[], answeredRows, readIds)
    : withQuestion.find((entry) => !readIds.has(entry.id)) ?? withQuestion[0];

  if (!selected) {
    return null;
  }

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
