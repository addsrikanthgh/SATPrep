import fs from "node:fs/promises";
import path from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { passageVisualSchema, qPassageFileSchema } from "@/lib/passage-schema";
import { normalizeQPassageFile, upsertPassageSet } from "@/lib/passage-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();
const bodySchema = z.object({
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

function checksumForContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function byQSequence(fileA: string, fileB: string) {
  const aMatch = fileA.match(/q_(\d+)\.json$/i);
  const bMatch = fileB.match(/q_(\d+)\.json$/i);

  const a = aMatch ? Number.parseInt(aMatch[1], 10) : Number.POSITIVE_INFINITY;
  const b = bMatch ? Number.parseInt(bMatch[1], 10) : Number.POSITIVE_INFINITY;

  if (a !== b) {
    return a - b;
  }

  return fileA.localeCompare(fileB);
}

/**
 * Some generated passage files embed the question prompt at the end of the
 * `passage` field instead of providing a separate `question` field.
 * Split on the last double-newline so the schema can validate normally.
 */
function splitEmbeddedQuestion(raw: unknown): unknown {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("passage" in raw) ||
    typeof (raw as Record<string, unknown>).passage !== "string" ||
    "question" in raw
  ) {
    return raw;
  }

  const passage = (raw as Record<string, unknown>).passage as string;
  const lastBreak = passage.lastIndexOf("\n\n");
  if (lastBreak === -1) return raw;

  const passageBody = passage.slice(0, lastBreak).trim();
  const questionText = passage.slice(lastBreak + 2).trim();

  if (!questionText) return raw;

  return { ...(raw as Record<string, unknown>), passage: passageBody, question: questionText };
}

export async function POST(request: Request) {
  if (!ADMIN_IMPORT_PASSCODE) {
    return NextResponse.json(
      { error: "Server is missing ADMIN_IMPORT_PASSCODE configuration." },
      { status: 500 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  if (!isPasscodeValid(parsedBody.data.adminPasscode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
  }

  const projectRoot = process.cwd();
  const passagesDir = path.join(projectRoot, "..", "Verbal", "questions", "Question_word_passages");
  const visualsDir = path.join(projectRoot, "..", "Verbal", "questions", "Question_word_passages_visuals");

  // ── 1. Pre-import visuals so foreign-key references in passage files resolve ──
  let visualsImported = 0;
  let visualsUpdated = 0;
  const knownVisualIds = new Set<string>();

  try {
    const visualFiles = (await fs.readdir(visualsDir))
      .filter((f) => /^qb_\d+\.json$/i.test(f))
      .sort();

    for (const vFile of visualFiles) {
      try {
        const raw = await fs.readFile(path.join(visualsDir, vFile), "utf8");
        const parsed = passageVisualSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) continue;

        const v = parsed.data;
        knownVisualIds.add(v.visual_id);

        const existed = await prisma.passageVisual.findUnique({
          where: { visualId: v.visual_id },
          select: { visualId: true },
        });

        await prisma.passageVisual.upsert({
          where: { visualId: v.visual_id },
          update: { type: v.type, data: v.data as Prisma.InputJsonValue, spec: v.spec as Prisma.InputJsonValue },
          create: { visualId: v.visual_id, type: v.type, data: v.data as Prisma.InputJsonValue, spec: v.spec as Prisma.InputJsonValue },
        });

        if (existed) {
          visualsUpdated += 1;
        } else {
          visualsImported += 1;
        }
      } catch {
        // Skip unreadable/invalid visual files — passage import continues.
      }
    }
  } catch {
    // Visuals directory missing or unreadable — proceed without visuals.
  }

  let files: string[] = [];
  try {
    files = (await fs.readdir(passagesDir))
      .filter((entry) => /^q_\d+\.json$/i.test(entry))
      .sort(byQSequence);
  } catch {
    return NextResponse.json({ error: "Passage source folder not found or unreadable." }, { status: 500 });
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    const fullPath = path.join(passagesDir, file);

    try {
      const raw = await fs.readFile(fullPath, "utf8");
      const checksum = checksumForContent(raw);
      const logRow = await prisma.passageImportLog.findUnique({ where: { filename: file } });

      if (logRow?.checksum === checksum) {
        skipped += 1;
        continue;
      }

      const json = JSON.parse(raw) as unknown;

      // Some files embed the question prompt at the end of the passage with no
      // separate "question" field. Detect and split before schema validation.
      const normalized_json = splitEmbeddedQuestion(json);

      const parsedFile = qPassageFileSchema.safeParse(normalized_json);

      if (!parsedFile.success) {
        failed += 1;
        errors.push({ file, error: JSON.stringify(parsedFile.error.flatten()) });
        continue;
      }

      const normalized = normalizeQPassageFile(parsedFile.data);

      const existing = await prisma.passageSet.findUnique({
        where: { id: normalized.id },
        select: { id: true },
      });

      await upsertPassageSet(prisma, normalized);

      await prisma.passageImportLog.upsert({
        where: { filename: file },
        update: {
          passageId: normalized.id,
          checksum,
          importedAt: new Date(),
        },
        create: {
          filename: file,
          passageId: normalized.id,
          checksum,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        imported += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push({
        file,
        error: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    sourceFolder: passagesDir,
    totalFiles: files.length,
    visualsImported,
    visualsUpdated,
    imported,
    updated,
    skipped,
    failed,
    errors,
  });
}
