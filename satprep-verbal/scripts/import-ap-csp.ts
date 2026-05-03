import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";

const questionSchema = z.object({
  id: z.string().min(1),
  stem: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  answer: z.number().int().nonnegative(),
  explanation: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

const fileSchema = z.union([
  z.object({ unit: z.string().min(1), questions: z.array(questionSchema).min(1) }),
  z.object({ unit: z.string().min(1), question: questionSchema }),
]);

function normalizeFileQuestions(parsed: z.infer<typeof fileSchema>): Array<z.infer<typeof questionSchema>> {
  if ("question" in parsed) return [parsed.question];
  return parsed.questions;
}

async function main() {
  const sourceDir = process.env.AP_CSP_DIR
    ? path.resolve(process.env.AP_CSP_DIR)
    : path.resolve(process.cwd(), "..", "ap_csp");

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  if (jsonFiles.length === 0) {
    console.log(`[csp-import] No JSON files found in ${sourceDir}`);
    return;
  }

  let inserted = 0;
  let updated = 0;
  const failures: Array<{ file: string; error: string }> = [];

  for (const fileName of jsonFiles) {
    const fullPath = path.join(sourceDir, fileName);

    try {
      const raw = await readFile(fullPath, "utf8");
      const parsedJson = JSON.parse(raw) as unknown;
      const parsed = fileSchema.safeParse(parsedJson);

      if (!parsed.success) {
        failures.push({ file: fileName, error: parsed.error.message });
        continue;
      }

      const { unit } = parsed.data;
      const questions = normalizeFileQuestions(parsed.data);

      for (const question of questions) {
        if (question.answer >= question.choices.length) {
          failures.push({
            file: fileName,
            error: `Question ${question.id} has answer index ${question.answer} out of range`,
          });
          continue;
        }

        const existing = await prisma.cspQuestion.findUnique({ where: { id: question.id } });

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
    } catch (error) {
      failures.push({ file: fileName, error: error instanceof Error ? error.message : "Unknown import error" });
    }
  }

  console.log(`[csp-import] Inserted: ${inserted}`);
  console.log(`[csp-import] Updated: ${updated}`);

  if (failures.length > 0) {
    console.log(`[csp-import] Failures: ${failures.length}`);
    for (const failure of failures) {
      console.log(`- ${failure.file}: ${failure.error}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("[csp-import] Fatal error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
