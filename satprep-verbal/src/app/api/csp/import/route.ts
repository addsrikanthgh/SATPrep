import fs from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

const bodySchema = z.object({
  adminPasscode: z.string().min(1),
});

const questionSchema = z.object({
  id: z.string().min(1),
  stem: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  answer: z.number().int().nonnegative(),
  explanation: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

// Accepts both formats:
//   { unit, questions: [...] }  – legacy / bulk format
//   { unit, question: {...} }   – one-question-per-file format
const fileSchema = z.union([
  z.object({ unit: z.string().min(1), questions: z.array(questionSchema).min(1) }),
  z.object({ unit: z.string().min(1), question: questionSchema }),
]);

function normalizeFileQuestions(parsed: z.infer<typeof fileSchema>): Array<z.infer<typeof questionSchema>> {
  if ("question" in parsed) return [parsed.question];
  return parsed.questions;
}

function isPasscodeValid(input: string) {
  if (!ADMIN_IMPORT_PASSCODE) return false;
  const expected = Buffer.from(ADMIN_IMPORT_PASSCODE, "utf8");
  const provided = Buffer.from(input, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
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

  const cspDir = path.join(process.cwd(), "..", "ap_csp");

  // Collect all .json files recursively (top-level and one level of subfolders)
  async function collectJsonFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await fs.readdir(fullPath, { withFileTypes: true });
        for (const subEntry of sub) {
          if (
            subEntry.isFile() &&
            subEntry.name.toLowerCase().endsWith(".json") &&
            subEntry.name !== "sample.json"
          ) {
            results.push(path.join(fullPath, subEntry.name));
          }
        }
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".json") &&
        entry.name !== "sample.json"
      ) {
        results.push(fullPath);
      }
    }
    return results.sort();
  }

  let files: string[] = [];
  try {
    files = await collectJsonFiles(cspDir);
  } catch {
    return NextResponse.json(
      { error: "AP CSP source folder not found or unreadable." },
      { status: 500 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      { success: true, inserted: 0, updated: 0, failed: 0, errors: [] },
    );
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const fullPath of files) {
    const fileName = path.relative(cspDir, fullPath);

    try {
      const raw = await fs.readFile(fullPath, "utf8");
      const parsed = fileSchema.safeParse(JSON.parse(raw) as unknown);

      if (!parsed.success) {
        failed += 1;
        errors.push({ file: fileName, error: parsed.error.message });
        continue;
      }

      const { unit } = parsed.data;
      const questions = normalizeFileQuestions(parsed.data);

      for (const question of questions) {
        if (question.answer >= question.choices.length) {
          failed += 1;
          errors.push({
            file: fileName,
            error: `Question ${question.id} has answer index ${question.answer} out of range (${question.choices.length} choices)`,
          });
          continue;
        }

        const existing = await prisma.cspQuestion.findUnique({
          where: { id: question.id },
          select: { id: true },
        });

        await prisma.cspQuestion.upsert({
          where: { id: question.id },
          create: {
            id: question.id,
            unit,
            stem: question.stem,
            choices: question.choices,
            correctAnswerIndex: question.answer,
            explanation: question.explanation,
            difficulty: question.difficulty,
          },
          update: {
            unit,
            stem: question.stem,
            choices: question.choices,
            correctAnswerIndex: question.answer,
            explanation: question.explanation,
            difficulty: question.difficulty,
          },
        });

        if (existing) {
          updated += 1;
        } else {
          inserted += 1;
        }
      }
    } catch (err) {
      failed += 1;
      errors.push({
        file: fileName,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ success: true, inserted, updated, failed, errors });
}
