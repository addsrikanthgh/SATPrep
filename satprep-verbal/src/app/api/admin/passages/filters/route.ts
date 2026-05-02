import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passcode = request.headers.get("x-admin-passcode") ?? "";
  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
  }

  const rows = await prisma.passageSet.findMany({
    select: { domain: true, skill: true },
    distinct: ["domain", "skill"],
    orderBy: [{ domain: "asc" }, { skill: "asc" }],
  });

  const skillsByDomain: Record<string, string[]> = {};
  for (const row of rows) {
    if (!skillsByDomain[row.domain]) {
      skillsByDomain[row.domain] = [];
    }
    skillsByDomain[row.domain].push(row.skill);
  }

  return NextResponse.json({
    domains: Object.keys(skillsByDomain).sort(),
    skillsByDomain,
  });
}