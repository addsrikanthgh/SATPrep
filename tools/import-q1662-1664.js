const fs = require("fs");
const path = require("path");

const { PrismaClient } = require("../satprep-verbal/node_modules/@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    const baseDir = path.join(__dirname, "..", "Verbal", "questions", "Question_word_passages");
    const ids = ["q_1662", "q_1663", "q_1664"];

    for (const id of ids) {
      const fullPath = path.join(baseDir, `${id}.json`);
      const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));

      if (!parsed.visual_id) {
        throw new Error(`${id} is missing visual_id`);
      }

      const visual = await prisma.passageVisual.findUnique({
        where: { visualId: parsed.visual_id },
        select: { visualId: true },
      });

      if (!visual) {
        throw new Error(`${id} references missing visual ${parsed.visual_id}`);
      }

      await prisma.$transaction(async (tx) => {
        await tx.passageSet.upsert({
          where: { id },
          update: {
            title: `${parsed.domain} · ${parsed.skill}`,
            domain: parsed.domain,
            skill: parsed.skill,
            difficulty: parsed.difficulty,
            sequence: Number.parseInt(id.split("_")[1], 10),
            sourceWords: JSON.stringify([]),
            passage: parsed.passage,
            version: 1,
          },
          create: {
            id,
            title: `${parsed.domain} · ${parsed.skill}`,
            domain: parsed.domain,
            skill: parsed.skill,
            difficulty: parsed.difficulty,
            sequence: Number.parseInt(id.split("_")[1], 10),
            sourceWords: JSON.stringify([]),
            passage: parsed.passage,
            version: 1,
          },
        });

        await tx.passageQuestion.deleteMany({ where: { passageSetId: id } });

        await tx.passageQuestion.create({
          data: {
            passageSetId: id,
            questionId: `${id}_q1`,
            questionType: parsed.skill,
            questionText: parsed.question,
            visualId: parsed.visual_id,
            choiceA: parsed.choices.A,
            choiceB: parsed.choices.B,
            choiceC: parsed.choices.C,
            choiceD: parsed.choices.D,
            correctAnswer: parsed.correct_answer,
            explanation: parsed.explanation,
          },
        });
      });
    }

    console.log("Imported q_1662 through q_1664 with visual links");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
