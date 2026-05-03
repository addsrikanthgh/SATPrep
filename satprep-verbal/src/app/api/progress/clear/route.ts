import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId = session.user.id;

  // Clear word and passage quiz metadata/progress for the current student.
  await prisma.$transaction([
    prisma.quizAnswer.deleteMany({ where: { quizSession: { studentId } } }),
    prisma.quizSession.deleteMany({ where: { studentId } }),
    prisma.studentProgress.deleteMany({ where: { studentId } }),
    prisma.passageQuizAnswer.deleteMany({ where: { session: { studentId } } }),
    prisma.passageQuizSession.deleteMany({ where: { studentId } }),
    prisma.studentPassageProgress.deleteMany({ where: { studentId } }),
    prisma.passageReadState.deleteMany({ where: { studentId } }),
  ]);

  return NextResponse.json({ success: true });
}
