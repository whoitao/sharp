import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = {
    questions: await prisma.question.count(),
    options: await prisma.questionOption.count(),
    progress: await prisma.userQuestionProgress.count(),
    kpLinks: await prisma.questionKnowledgePoint.count(),
  };
  console.log("删除前:", before);

  // 顺序：先删引用 question 的表（无外键级联的必须先删），最后删 question
  const result = await prisma.$transaction(async (tx) => {
    const progress = await tx.userQuestionProgress.deleteMany();
    const options = await tx.questionOption.deleteMany();
    const kpLinks = await tx.questionKnowledgePoint.deleteMany();
    const questions = await tx.question.deleteMany();
    return { progress, options, kpLinks, questions };
  });

  console.log("已删除:", {
    userQuestionProgress: result.progress.count,
    questionOption: result.options.count,
    questionKnowledgePoint: result.kpLinks.count,
    question: result.questions.count,
  });

  const after = {
    questions: await prisma.question.count(),
    options: await prisma.questionOption.count(),
    progress: await prisma.userQuestionProgress.count(),
    kpLinks: await prisma.questionKnowledgePoint.count(),
  };
  console.log("删除后:", after);
}

main()
  .catch((e) => {
    console.error("清空失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
