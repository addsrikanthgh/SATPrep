import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId = session.user.id;

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
