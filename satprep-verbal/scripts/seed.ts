import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { passageSetSchema, passageVisualSchema, qPassageFileSchema } from "../src/lib/passage-schema";
import { normalizeQPassageFile, upsertPassageSet } from "../src/lib/passage-service";

type WordRecord = {
  word: string;
  partOfSpeech: string;
  synonym: string;
  sentence?: string;
  sentence_1?: string;
  sentence_2?: string;
  sentence_3?: string;
  sentence_4?: string;
  sentence_5?: string;
};

type BlankRecord = WordRecord & {
  blankSentence?: string;
  blankSentence_1?: string;
  blankSentence_2?: string;
  blankSentence_3?: string;
  blankSentence_4?: string;
  blankSentence_5?: string;
};

const prisma = new PrismaClient();

function normalizeSentences(entry: WordRecord) {
  const sentence_1 = (entry.sentence_1 ?? entry.sentence ?? "").trim();
  const sentence_2 = entry.sentence_2?.trim() || null;
  const sentence_3 = entry.sentence_3?.trim() || null;
  const sentence_4 = entry.sentence_4?.trim() || null;
  const sentence_5 = entry.sentence_5?.trim() || null;

  return { sentence_1, sentence_2, sentence_3, sentence_4, sentence_5 };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  const normalized = raw.replace(/^\uFEFF/, "");
  return JSON.parse(normalized) as T;
}

async function seedWordsAndBlanks(projectRoot: string) {
  const wordsPath = path.join(projectRoot, "..", "Verbal", "words", "SATWords.json");
  const blanksPath = path.join(
    projectRoot,
    "..",
    "Verbal",
    "questions",
    "work_blanks",
    "Question_word_blanks.json",
  );

  const words = await readJsonFile<WordRecord[]>(wordsPath);
  const blanks = await readJsonFile<BlankRecord[]>(blanksPath);

  const counters = new Map<string, number>();
  const dedupedWords = new Map<string, WordRecord>();
  for (const entry of words) {
    if (!dedupedWords.has(entry.word)) {
      dedupedWords.set(entry.word, entry);
    }
  }

  const wordRows = [...dedupedWords.values()].map((entry) => {
    const letter = entry.word[0]?.toUpperCase() ?? "#";
    const nextOrder = (counters.get(letter) ?? 0) + 1;
    counters.set(letter, nextOrder);
    const sentences = normalizeSentences(entry);

    return {
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      synonym: entry.synonym,
      sentence_1: sentences.sentence_1,
      sentence_2: sentences.sentence_2,
      sentence_3: sentences.sentence_3,
      sentence_4: sentences.sentence_4,
      sentence_5: sentences.sentence_5,
      alphabetLetter: letter,
      alphabetOrder: nextOrder,
    };
  });

  await prisma.studentProgress.deleteMany();
  await prisma.blankSentenceQuestion.deleteMany();
  await prisma.word.deleteMany();

  await prisma.word.createMany({ data: wordRows });

  const wordMap = new Map(
    (await prisma.word.findMany({ select: { id: true, word: true } })).map((row) => [row.word, row.id]),
  );

  const blankRows = blanks
    .map((entry) => {
      const wordId = wordMap.get(entry.word);
      if (!wordId) {
        return null;
      }

      return {
        wordId,
        sentence: (entry.sentence_1 ?? entry.sentence ?? "").trim(),
        blankSentence: (entry.blankSentence_1 ?? entry.blankSentence ?? "").trim(),
        sentence_2: entry.sentence_2?.trim() || null,
        blankSentence_2: entry.blankSentence_2?.trim() || null,
        sentence_3: entry.sentence_3?.trim() || null,
        blankSentence_3: entry.blankSentence_3?.trim() || null,
        sentence_4: entry.sentence_4?.trim() || null,
        blankSentence_4: entry.blankSentence_4?.trim() || null,
        sentence_5: entry.sentence_5?.trim() || null,
        blankSentence_5: entry.blankSentence_5?.trim() || null,
      };
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        entry !== null && entry.sentence.length > 0 && entry.blankSentence.length > 0,
    );

  const uniqueBlankRows = [...new Map(blankRows.map((row) => [row.wordId, row])).values()];

  if (uniqueBlankRows.length > 0) {
    await prisma.blankSentenceQuestion.createMany({ data: uniqueBlankRows });
  }

  return { words: wordRows.length, blanks: uniqueBlankRows.length };
}

async function seedPassageVisuals(projectRoot: string) {
  const visualsDir = path.join(projectRoot, "..", "Verbal", "questions", "Question_word_passages_visuals");
  let entries: string[] = [];

  try {
    entries = await fs.readdir(visualsDir);
  } catch {
    return { visualsImported: 0, visualsUpdated: 0, visualIds: new Set<string>() };
  }

  const jsonFiles = entries
    .filter((fileName) => /^qb_\d+\.json$/i.test(fileName))
    .sort();
  let visualsImported = 0;
  let visualsUpdated = 0;
  const visualIds = new Set<string>();

  for (const fileName of jsonFiles) {
    const fullPath = path.join(visualsDir, fileName);
    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const visual = passageVisualSchema.parse(parsed);

    const existed = await prisma.passageVisual.findUnique({
      where: { visualId: visual.visual_id },
      select: { visualId: true },
    });

    await prisma.passageVisual.upsert({
      where: { visualId: visual.visual_id },
      update: {
        type: visual.type,
        data: visual.data,
        spec: visual.spec,
      },
      create: {
        visualId: visual.visual_id,
        type: visual.type,
        data: visual.data,
        spec: visual.spec,
      },
    });

    visualIds.add(visual.visual_id);
    if (existed) {
      visualsUpdated += 1;
    } else {
      visualsImported += 1;
    }
  }

  return { visualsImported, visualsUpdated, visualIds };
}

async function seedPassages(projectRoot: string, visualIds: Set<string>) {
  const passagesDir = path.join(projectRoot, "..", "Verbal", "questions", "Question_word_passages");
  const files = await fs.readdir(passagesDir);
  const jsonFiles = files
    .filter((fileName) => /^q_\d+\.json$/i.test(fileName) || fileName.toLowerCase().endsWith(".json"))
    .sort();

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (const fileName of jsonFiles) {
    const fullPath = path.join(passagesDir, fileName);
    const raw = await fs.readFile(fullPath, "utf8");
    const checksum = createHash("sha256").update(raw, "utf8").digest("hex");
    const parsed = JSON.parse(raw) as unknown;

    const asQ = qPassageFileSchema.safeParse(parsed);
    const normalized = asQ.success ? normalizeQPassageFile(asQ.data) : passageSetSchema.parse(parsed);

    const missingVisualIds = normalized.questions
      .map((question) => question.visualId)
      .filter((id): id is string => !!id && !visualIds.has(id));

    if (missingVisualIds.length > 0) {
      throw new Error(`Missing visual(s) for ${fileName}: ${missingVisualIds.join(", ")}`);
    }

    const log = await prisma.passageImportLog.findUnique({ where: { filename: fileName } });
    if (log?.checksum === checksum) {
      skipped += 1;
      continue;
    }

    const existed = await prisma.passageSet.findUnique({ where: { id: normalized.id }, select: { id: true } });
    await upsertPassageSet(prisma, normalized);

    await prisma.passageImportLog.upsert({
      where: { filename: fileName },
      update: {
        passageId: normalized.id,
        checksum,
        importedAt: new Date(),
      },
      create: {
        filename: fileName,
        passageId: normalized.id,
        checksum,
      },
    });

    if (existed) {
      updated += 1;
    } else {
      imported += 1;
    }
  }

  return { passageSetsImported: imported, passageSetsUpdated: updated, passageSetsSkipped: skipped };
}

async function main() {
  const projectRoot = process.cwd();

  const wordSummary = await seedWordsAndBlanks(projectRoot);
  const visualSummary = await seedPassageVisuals(projectRoot);
  const passageSummary = await seedPassages(projectRoot, visualSummary.visualIds);

  console.log({
    ...wordSummary,
    visualsImported: visualSummary.visualsImported,
    visualsUpdated: visualSummary.visualsUpdated,
    ...passageSummary,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
