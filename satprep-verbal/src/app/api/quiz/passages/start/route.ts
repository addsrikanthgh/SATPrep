import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPassageQuizNumber } from "@/lib/passage-quiz";

const startSchema = z.object({
  questionCount: z.number().int().positive().max(100).default(10).optional(),
  filterDomain: z.string().optional().nullable(),
  filterSkill: z.string().optional().nullable(),
  dsatStyle: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  const parsed = startSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dsatStyle = parsed.data.dsatStyle ?? false;
  const questionCount = dsatStyle ? 27 : (parsed.data.questionCount ?? 10);
  const filterDomain = dsatStyle ? null : (parsed.data.filterDomain ?? null);
  const filterSkill = dsatStyle ? null : (parsed.data.filterSkill ?? null);

  const domainTag = filterDomain ? filterDomain.slice(0, 6).toUpperCase().replace(/\s+/g, "") : "MIXED";
  const skillTag = filterSkill ? `-${filterSkill.slice(0, 8).toUpperCase().replace(/\s+/g, "")}` : "";
  const quizNumber = await getPassageQuizNumber(prisma, studentId);
  const quizName = dsatStyle
    ? `P-Q${quizNumber}-DSAT-${questionCount}`
    : `P-Q${quizNumber}-${domainTag}${skillTag}-${questionCount}`;

  const created = await prisma.passageQuizSession.create({
    data: {
      studentId,
      quizNumber,
      quizName,
      questionCount,
      status: "in_progress",
      filterDomain,
      filterSkill,
    },
  });

  return NextResponse.json(created);
}
