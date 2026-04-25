import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { passageSetSchema } from "../src/lib/passage-schema";
import { upsertPassageSet } from "../src/lib/passage-service";

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
  blankSentence: string;
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
    "Question_work_blanks.json",
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
        sentence: entry.sentence_1 ?? entry.sentence ?? "",
        blankSentence: entry.blankSentence,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const uniqueBlankRows = [...new Map(blankRows.map((row) => [row.wordId, row])).values()];

  if (uniqueBlankRows.length > 0) {
    await prisma.blankSentenceQuestion.createMany({ data: uniqueBlankRows });
  }

  return { words: wordRows.length, blanks: uniqueBlankRows.length };
}

async function seedPassages(projectRoot: string) {
  const passagesDir = path.join(projectRoot, "..", "Verbal", "questions", "Question_word_passages");
  const files = await fs.readdir(passagesDir);
  const jsonFiles = files.filter((fileName) => fileName.toLowerCase().endsWith(".json"));

  await prisma.passageQuestion.deleteMany();
  await prisma.passageSet.deleteMany();

  let imported = 0;
  for (const fileName of jsonFiles) {
    const fullPath = path.join(passagesDir, fileName);
    const parsed = await readJsonFile<unknown>(fullPath);
    const passageSet = passageSetSchema.parse(parsed);
    await upsertPassageSet(prisma, passageSet);
    imported += 1;
  }

  return { passageSets: imported };
}

async function main() {
  const projectRoot = process.cwd();

  const wordSummary = await seedWordsAndBlanks(projectRoot);
  const passageSummary = await seedPassages(projectRoot);

  // eslint-disable-next-line no-console
  console.log({ ...wordSummary, ...passageSummary });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
