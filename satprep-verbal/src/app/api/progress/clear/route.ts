import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  studentId: z.string().min(1),
});

export async function DELETE(request: Request) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { studentId } = payload.data;

  // Delete in dependency order: QuizAnswer -> QuizSession -> StudentProgress
  const sessions = await prisma.quizSession.findMany({
    where: { studentId },
    select: { id: true },
  });

  const sessionIds = sessions.map((s) => s.id);

  await prisma.$transaction([
    prisma.quizAnswer.deleteMany({ where: { quizSessionId: { in: sessionIds } } }),
    prisma.quizSession.deleteMany({ where: { studentId } }),
    prisma.studentProgress.deleteMany({ where: { studentId } }),
  ]);

  return NextResponse.json({ success: true });
}
