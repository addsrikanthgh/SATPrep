import { NextResponse } from "next/server";
import { uploadPayloadSchema } from "@/lib/passage-schema";
import { upsertPassageSet } from "@/lib/passage-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = uploadPayloadSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const passageSets = "passageSets" in payload ? payload.passageSets : [payload];

  for (const passageSet of passageSets) {
    await upsertPassageSet(prisma, passageSet);
  }

  return NextResponse.json({ status: "ok", imported: passageSets.length });
}
