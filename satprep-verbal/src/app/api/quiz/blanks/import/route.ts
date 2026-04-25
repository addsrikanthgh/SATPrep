import fs from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

const blankQuestionSchema = z
  .object({
    word: z.string().trim().min(1),
    sentence: z.string().trim().min(1).optional(),
    blankSentence: z.string().trim().min(1).optional(),
    sentence_1: z.string().trim().min(1).optional(),
    blankSentence_1: z.string().trim().min(1).optional(),
    sentence_2: z.string().trim().min(1).optional(),
    blankSentence_2: z.string().trim().min(1).optional(),
    sentence_3: z.string().trim().min(1).optional(),
    blankSentence_3: z.string().trim().min(1).optional(),
    sentence_4: z.string().trim().min(1).optional(),
    blankSentence_4: z.string().trim().min(1).optional(),
    sentence_5: z.string().trim().min(1).optional(),
    blankSentence_5: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const sentence1 = (value.sentence_1 ?? value.sentence ?? "").trim();
    const blankSentence1 = (value.blankSentence_1 ?? value.blankSentence ?? "").trim();

    if (!sentence1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sentence_1"],
        message: "Each row needs sentence_1 (or legacy sentence).",
      });
    }

    if (!blankSentence1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blankSentence_1"],
        message: "Each row needs blankSentence_1 (or legacy blankSentence).",
      });
    }

    for (const index of [2, 3, 4, 5] as const) {
      const sentenceKey = `sentence_${index}` as const;
      const blankSentenceKey = `blankSentence_${index}` as const;
      const hasSentence = !!value[sentenceKey]?.trim();
      const hasBlankSentence = !!value[blankSentenceKey]?.trim();

      if (hasSentence !== hasBlankSentence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [hasSentence ? blankSentenceKey : sentenceKey],
          message: `sentence_${index} and blankSentence_${index} must be provided together.`,
        });
      }
    }
  });

const importSchema = z.object({
  questions: z.array(blankQuestionSchema).min(1),
  adminPasscode: z.string().min(1),
  saveToSourceFile: z.boolean().optional(),
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

type NormalizedBlankQuestion = {
  word: string;
  sentence: string;
  blankSentence: string;
  sentence_2: string | null;
  blankSentence_2: string | null;
  sentence_3: string | null;
  blankSentence_3: string | null;
  sentence_4: string | null;
  blankSentence_4: string | null;
  sentence_5: string | null;
  blankSentence_5: string | null;
};

function normalizeBlankQuestionRows(rows: z.infer<typeof blankQuestionSchema>[]) {
  const deduped = new Map<string, NormalizedBlankQuestion>();

  for (const row of rows) {
    const key = row.word.toLowerCase();
    if (deduped.has(key)) {
      continue;
    }

    deduped.set(key, {
      word: row.word.trim(),
      sentence: (row.sentence_1 ?? row.sentence ?? "").trim(),
      blankSentence: (row.blankSentence_1 ?? row.blankSentence ?? "").trim(),
      sentence_2: row.sentence_2?.trim() || null,
      blankSentence_2: row.blankSentence_2?.trim() || null,
      sentence_3: row.sentence_3?.trim() || null,
      blankSentence_3: row.blankSentence_3?.trim() || null,
      sentence_4: row.sentence_4?.trim() || null,
      blankSentence_4: row.blankSentence_4?.trim() || null,
      sentence_5: row.sentence_5?.trim() || null,
      blankSentence_5: row.blankSentence_5?.trim() || null,
    });
  }

  return [...deduped.values()];
}

async function saveBlankQuestionsJsonFile(questions: NormalizedBlankQuestion[]) {
  const projectRoot = process.cwd();
  const filePath = path.join(projectRoot, "..", "Verbal", "questions", "work_blanks", "Question_word_blanks.json");

  const compactQuestions = questions.map((entry) => ({
    word: entry.word,
    sentence_1: entry.sentence,
    blankSentence_1: entry.blankSentence,
    ...(entry.sentence_2 ? { sentence_2: entry.sentence_2 } : {}),
    ...(entry.blankSentence_2 ? { blankSentence_2: entry.blankSentence_2 } : {}),
    ...(entry.sentence_3 ? { sentence_3: entry.sentence_3 } : {}),
    ...(entry.blankSentence_3 ? { blankSentence_3: entry.blankSentence_3 } : {}),
    ...(entry.sentence_4 ? { sentence_4: entry.sentence_4 } : {}),
    ...(entry.blankSentence_4 ? { blankSentence_4: entry.blankSentence_4 } : {}),
    ...(entry.sentence_5 ? { sentence_5: entry.sentence_5 } : {}),
    ...(entry.blankSentence_5 ? { blankSentence_5: entry.blankSentence_5 } : {}),
  }));

  const payload = `${JSON.stringify(compactQuestions, null, 2)}\n`;
  await fs.writeFile(filePath, payload, "utf8");
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

  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { questions, adminPasscode, saveToSourceFile = true } = parsed.data;

  if (!isPasscodeValid(adminPasscode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
  }

  const normalizedQuestions = normalizeBlankQuestionRows(questions);
  let importedCount = 0;
  let skippedMissingWordCount = 0;

  for (const question of normalizedQuestions) {
    const word = await prisma.word.findUnique({
      where: { word: question.word },
      select: { id: true },
    });

    if (!word) {
      skippedMissingWordCount += 1;
      continue;
    }

    await prisma.blankSentenceQuestion.upsert({
      where: { wordId: word.id },
      update: {
        sentence: question.sentence,
        blankSentence: question.blankSentence,
        sentence_2: question.sentence_2,
        blankSentence_2: question.blankSentence_2,
        sentence_3: question.sentence_3,
        blankSentence_3: question.blankSentence_3,
        sentence_4: question.sentence_4,
        blankSentence_4: question.blankSentence_4,
        sentence_5: question.sentence_5,
        blankSentence_5: question.blankSentence_5,
      },
      create: {
        wordId: word.id,
        sentence: question.sentence,
        blankSentence: question.blankSentence,
        sentence_2: question.sentence_2,
        blankSentence_2: question.blankSentence_2,
        sentence_3: question.sentence_3,
        blankSentence_3: question.blankSentence_3,
        sentence_4: question.sentence_4,
        blankSentence_4: question.blankSentence_4,
        sentence_5: question.sentence_5,
        blankSentence_5: question.blankSentence_5,
      },
    });
    importedCount += 1;
  }

  if (saveToSourceFile) {
    try {
      await saveBlankQuestionsJsonFile(normalizedQuestions);
    } catch {
      return NextResponse.json(
        {
          error:
            "Questions imported to database, but Question_word_blanks.json could not be updated on disk. Check file permissions and path.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    importedCount,
    skippedMissingWordCount,
    sourceFileUpdated: saveToSourceFile,
  });
}
