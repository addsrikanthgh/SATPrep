import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ visualId: string }>;
};

export async function GET(_request: Request, context: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { visualId } = await context.params;
  const visual = await prisma.passageVisual.findUnique({
    where: { visualId },
    select: { visualId: true, type: true, data: true, spec: true },
  });

  if (!visual) {
    return NextResponse.json({ error: "Visual not found." }, { status: 404 });
  }

  return NextResponse.json(visual);
}
