import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const startSchema = z.object({
  studentId: z.string().min(1).optional(),
  quizType: z.enum(["meaning", "blank"]),
  quizName: z.string().min(1).optional(),
  alphabetLetter: z.string().min(1).max(120),
  questionCount: z.number().int().positive(),
});

function compactAlphabetSelection(selection: string) {
  const raw = selection.trim().toUpperCase();

  if (raw === "ALL") {
    return "ALL";
  }

  const letters = [...new Set(raw.split(",").map((value) => value.trim()))]
    .filter((value) => /^[A-Z]$/.test(value))
    .sort();

  if (letters.length === 0) {
    return "A";
  }

  if (letters.length === 26) {
    return "ALL";
  }

  if (letters.length <= 8) {
    return letters.join("");
  }

  return `${letters.slice(0, 4).join("")}..${letters.slice(-2).join("")}${letters.length}`;
}

export async function POST(request: Request) {
  const payload = startSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const studentId = payload.data.studentId ?? "local-default-student";
  const quizType = payload.data.quizType;

  const latest = await prisma.quizSession.findFirst({
    where: { studentId, quizType },
    orderBy: { quizNumber: "desc" },
    select: { quizNumber: true },
  });

  const quizNumber = (latest?.quizNumber ?? 0) + 1;
  const typeCode = quizType === "meaning" ? "M" : "B";
  const alphabetCode = compactAlphabetSelection(payload.data.alphabetLetter);
  const generatedName = `${typeCode}-Q${quizNumber}-${alphabetCode}-W${payload.data.questionCount}`;
  const quizName = payload.data.quizName?.trim() || generatedName;

  const session = await prisma.quizSession.create({
    data: {
      studentId,
      quizType,
      quizNumber,
      quizName,
      alphabetLetter: payload.data.alphabetLetter.toUpperCase(),
      questionCount: payload.data.questionCount,
      status: "in_progress",
    },
  });

  return NextResponse.json(session);
}
