import type { PrismaClient } from "@prisma/client";
import type { PassageSetInput } from "@/lib/passage-schema";

export async function upsertPassageSet(prisma: PrismaClient, input: PassageSetInput) {
  await prisma.$transaction(async (tx) => {
    await tx.passageSet.upsert({
      where: { id: input.id },
      update: {
        title: input.title,
        sourceWords: JSON.stringify(input.sourceWords),
        passage: input.passage,
        version: input.version ?? 1,
      },
      create: {
        id: input.id,
        title: input.title,
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
