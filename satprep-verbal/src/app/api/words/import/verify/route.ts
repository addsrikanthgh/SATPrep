import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

const verifySchema = z.object({
  adminPasscode: z.string().min(1),
});

function isPasscodeValid(input: string) {
  if (!ADMIN_IMPORT_PASSCODE) {
    return false;
  }

  const expected = Buffer.from(ADMIN_IMPORT_PASSCODE, "utf8");
  const provided = Buffer.from(input, "utf8");

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

export async function POST(request: Request) {
  if (!ADMIN_IMPORT_PASSCODE) {
    return NextResponse.json(
      { error: "Server is missing ADMIN_IMPORT_PASSCODE configuration." },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isPasscodeValid(parsed.data.adminPasscode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
