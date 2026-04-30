import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.passageSet.findMany({
    select: { domain: true, skill: true },
    distinct: ["domain", "skill"],
    orderBy: [{ domain: "asc" }, { skill: "asc" }],
  });

  // Build { domain -> skill[] } map
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.domain]) map[row.domain] = [];
    if (!map[row.domain].includes(row.skill)) map[row.domain].push(row.skill);
  }

  return NextResponse.json({ domains: Object.keys(map).sort(), skillsByDomain: map });
}
