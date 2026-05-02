import type { PrismaClient } from "@prisma/client";
import type { PassageSetInput, QPassageFileInput } from "@/lib/passage-schema";

export async function upsertPassageSet(prisma: PrismaClient, input: PassageSetInput) {
  await prisma.$transaction(async (tx) => {
    const sequence = extractSequenceFromPassageId(input.id);

    await tx.passageSet.upsert({
      where: { id: input.id },
      update: {
        title: input.title,
        domain: input.domain ?? "Unknown",
        skill: input.skill ?? "Unknown",
        difficulty: input.difficulty ?? "medium",
        sequence,
        sourceWords: JSON.stringify(input.sourceWords),
        passage: input.passage,
        version: input.version ?? 1,
      },
      create: {
        id: input.id,
        title: input.title,
        domain: input.domain ?? "Unknown",
        skill: input.skill ?? "Unknown",
        difficulty: input.difficulty ?? "medium",
        sequence,
        sourceWords: JSON.stringify(input.sourceWords),
        passage: input.passage,
        version: input.version ?? 1,
      },
    });

    await tx.passageQuestion.deleteMany({ where: { passageSetId: input.id } });

    await tx.passageQuestion.createMany({
      data: input.questions.map((question) => ({
        passageSetId: input.id,
        questionId: question.questionId,
        questionType: question.questionType,
        questionText: question.question,
        visualId: question.visualId ?? null,
        choiceA: question.choices.A,
        choiceB: question.choices.B,
        choiceC: question.choices.C,
        choiceD: question.choices.D,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      })),
    });
  });
}

export function extractSequenceFromPassageId(id: string) {
  const match = id.match(/q_(\d+)$/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeQPassageFile(input: QPassageFileInput): PassageSetInput {
  return {
    id: input.id,
    title: `${input.domain} · ${input.skill}`,
    domain: input.domain,
    skill: input.skill,
    difficulty: input.difficulty,
    sourceWords: [],
    passage: input.passage,
    version: 1,
    questions: [
      {
        questionId: `${input.id}_q1`,
        questionType: input.skill,
        visualId: input.visual_id ?? null,
        question: input.question,
        choices: input.choices,
        correctAnswer: input.correct_answer,
        explanation: input.explanation,
      },
    ],
  };
}
