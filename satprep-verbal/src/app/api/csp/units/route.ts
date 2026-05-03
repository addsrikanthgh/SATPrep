import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatCspUnitLabel } from "@/lib/csp";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.cspQuestion.groupBy({
    by: ["unit"],
    _count: {
      _all: true,
    },
    orderBy: {
      unit: "asc",
    },
  });

  const units = rows.map((row) => ({
    value: row.unit,
    label: formatCspUnitLabel(row.unit),
    availableQuestions: row._count._all,
  }));

  return NextResponse.json({
    units,
    totalQuestions: units.reduce((sum, row) => sum + row.availableQuestions, 0),
  });
}