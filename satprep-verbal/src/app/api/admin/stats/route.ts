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

  const [passageCount, blankCount, byDomain, bySkill] = await Promise.all([
    prisma.passageSet.count(),
    prisma.blankSentenceQuestion.count(),
    prisma.passageSet.groupBy({ by: ["domain"], _count: { id: true } }),
    prisma.passageSet.groupBy({ by: ["skill"],  _count: { id: true } }),
  ]);

  return NextResponse.json({
    passageCount,
    blankCount,
    byDomain: byDomain
      .map((r) => ({ label: r.domain, count: r._count.id }))
      .sort((a, b) => b.count - a.count),
    bySkill: bySkill
      .map((r) => ({ label: r.skill, count: r._count.id }))
      .sort((a, b) => b.count - a.count),
  });
}
