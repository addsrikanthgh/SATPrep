import fs from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const ADMIN_IMPORT_PASSCODE = process.env.ADMIN_IMPORT_PASSCODE?.trim();

const wordSchema = z.object({
  word: z.string().trim().min(1),
  partOfSpeech: z.string().trim().min(1),
  synonym: z.string().trim().min(1),
  sentence: z.string().trim().min(1).optional(),
  sentence_1: z.string().trim().min(1).optional(),
  sentence_2: z.string().trim().min(1).optional(),
  sentence_3: z.string().trim().min(1).optional(),
  sentence_4: z.string().trim().min(1).optional(),
  sentence_5: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  const hasFirstSentence = (value.sentence_1 ?? value.sentence ?? "").trim().length > 0;
  if (!hasFirstSentence) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sentence_1"],
      message: "Each word needs sentence_1 (or legacy sentence).",
    });
  }
});

const importSchema = z.object({
  words: z.array(wordSchema).min(1),
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

type NormalizedWord = {
  word: string;
  partOfSpeech: string;
  synonym: string;
  sentence_1: string;
  sentence_2: string | null;
  sentence_3: string | null;
  sentence_4: string | null;
  sentence_5: string | null;
  alphabetLetter: string;
  alphabetOrder: number;
};

function normalizeWordRows(rows: z.infer<typeof wordSchema>[]) {
  const deduped = new Map<string, NormalizedWord>();
  const counters = new Map<string, number>();

  for (const row of rows) {
    const key = row.word.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, {
        word: row.word.trim(),
        partOfSpeech: row.partOfSpeech.trim(),
        synonym: row.synonym.trim(),
        sentence_1: (row.sentence_1 ?? row.sentence ?? "").trim(),
        sentence_2: row.sentence_2?.trim() || null,
        sentence_3: row.sentence_3?.trim() || null,
        sentence_4: row.sentence_4?.trim() || null,
        sentence_5: row.sentence_5?.trim() || null,
        alphabetLetter: "#",
        alphabetOrder: 0,
      });
    }
  }

  const normalized = [...deduped.values()].map((entry) => {
    const letter = entry.word[0]?.toUpperCase() ?? "#";
    const alphabetLetter = /^[A-Z]$/.test(letter) ? letter : "#";
    const order = (counters.get(alphabetLetter) ?? 0) + 1;
    counters.set(alphabetLetter, order);

    return {
      ...entry,
      alphabetLetter,
      alphabetOrder: order,
    };
  });

  return normalized;
}

async function saveWordsJsonFile(words: NormalizedWord[]) {
  const projectRoot = process.cwd();
  const filePath = path.join(projectRoot, "..", "Verbal", "words", "SATWords.json");
  const compactWords = words.map((word) => ({
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    synonym: word.synonym,
    sentence_1: word.sentence_1,
    ...(word.sentence_2 ? { sentence_2: word.sentence_2 } : {}),
    ...(word.sentence_3 ? { sentence_3: word.sentence_3 } : {}),
    ...(word.sentence_4 ? { sentence_4: word.sentence_4 } : {}),
    ...(word.sentence_5 ? { sentence_5: word.sentence_5 } : {}),
  }));
  const payload = `${JSON.stringify(compactWords, null, 2)}\n`;
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

  const { words, adminPasscode, saveToSourceFile = true } = parsed.data;

  if (!isPasscodeValid(adminPasscode)) {
    return NextResponse.json({ error: "Invalid admin passcode." }, { status: 401 });
  }

  const normalizedWords = normalizeWordRows(words);

  for (const word of normalizedWords) {
    await prisma.word.upsert({
      where: { word: word.word },
      update: {
        partOfSpeech: word.partOfSpeech,
        synonym: word.synonym,
        sentence_1: word.sentence_1,
        sentence_2: word.sentence_2,
        sentence_3: word.sentence_3,
        sentence_4: word.sentence_4,
        sentence_5: word.sentence_5,
        alphabetLetter: word.alphabetLetter,
        alphabetOrder: word.alphabetOrder,
      },
      create: {
        word: word.word,
        partOfSpeech: word.partOfSpeech,
        synonym: word.synonym,
        sentence_1: word.sentence_1,
        sentence_2: word.sentence_2,
        sentence_3: word.sentence_3,
        sentence_4: word.sentence_4,
        sentence_5: word.sentence_5,
        alphabetLetter: word.alphabetLetter,
        alphabetOrder: word.alphabetOrder,
      },
    });
  }

  if (saveToSourceFile) {
    try {
      await saveWordsJsonFile(normalizedWords);
    } catch {
      return NextResponse.json(
        {
          error:
            "Words imported to database, but SATWords.json could not be updated on disk. Check file permissions and path.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    importedCount: normalizedWords.length,
    sourceFileUpdated: saveToSourceFile,
  });
}
