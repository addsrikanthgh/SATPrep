const { PrismaClient } = require("../satprep-verbal/node_modules/@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const visuals = await prisma.passageVisual.count();
  const questionVisualLinks = await prisma.passageQuestion.count({
    where: { visualId: { not: null } },
  });

  const q1662 = await prisma.passageQuestion.findFirst({
    where: { passageSetId: "q_1662" },
    select: { passageSetId: true, questionId: true, visualId: true },
  });

  const q1663 = await prisma.passageQuestion.findFirst({
    where: { passageSetId: "q_1663" },
    select: { passageSetId: true, questionId: true, visualId: true },
  });

  const q1664 = await prisma.passageQuestion.findFirst({
    where: { passageSetId: "q_1664" },
    select: { passageSetId: true, questionId: true, visualId: true },
  });

  console.log(
    JSON.stringify(
      {
        visuals,
        questionVisualLinks,
        q1662,
        q1663,
        q1664,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
