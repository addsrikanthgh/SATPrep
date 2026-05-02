import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

function verifyPasscode(provided: string): boolean {
  if (!ADMIN_IMPORT_PASSCODE) return false;
  try {
    const expected = Buffer.from(ADMIN_IMPORT_PASSCODE, "utf8");
    const actual = Buffer.from(provided, "utf8");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passcode = request.headers.get("x-admin-passcode") ?? "";
  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const domain = searchParams.get("domain") ?? undefined;
  const skill = searchParams.get("skill") ?? undefined;
  const difficulty = searchParams.get("difficulty") ?? undefined;
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  const where = {
    ...(domain ? { domain } : {}),
    ...(skill ? { skill } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" as const } },
            { passage: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.passageSet.count({ where }),
    prisma.passageSet.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        domain: true,
        skill: true,
        difficulty: true,
        passage: true,
        questions: {
          select: {
            questionId: true,
            questionType: true,
            questionText: true,
            visualId: true,
            choiceA: true,
            choiceB: true,
            choiceC: true,
            choiceD: true,
            correctAnswer: true,
            explanation: true,
          },
          orderBy: { id: "asc" },
        },
      },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, rows });
}
