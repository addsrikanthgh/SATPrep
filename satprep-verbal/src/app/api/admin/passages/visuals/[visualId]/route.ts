import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

type Params = {
  params: Promise<{ visualId: string }>;
};

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

export async function GET(request: Request, context: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passcode = request.headers.get("x-admin-passcode") ?? "";
  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
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
