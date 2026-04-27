import { NextResponse } from "next/server";
import { passageSetSchema } from "@/lib/passage-schema";
import { upsertPassageSet } from "@/lib/passage-service";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const passageSet = await prisma.passageSet.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { questionId: "asc" },
      },
    },
  });

  if (!passageSet) {
    return NextResponse.json({ error: "Passage set not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: passageSet.id,
    title: passageSet.title,
    domain: passageSet.domain,
    skill: passageSet.skill,
    difficulty: passageSet.difficulty,
    sequence: passageSet.sequence,
    sourceWords: JSON.parse(passageSet.sourceWords) as string[],
    passage: passageSet.passage,
    version: passageSet.version,
    questions: passageSet.questions.map((question) => ({
      questionId: question.questionId,
      questionType: question.questionType,
      question: question.questionText,
      choices: {
        A: question.choiceA,
        B: question.choiceB,
        C: question.choiceC,
        D: question.choiceD,
      },
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    })),
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = passageSetSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.id !== id) {
    return NextResponse.json({ error: "Payload id must match route id" }, { status: 400 });
  }

  await upsertPassageSet(prisma, parsed.data);

  return NextResponse.json({ status: "updated", id });
}
