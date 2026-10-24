import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex, correctCount, wrongCount, durationSeconds, answers } = body;

  if (
    categoryId === undefined ||
    unitIndex === undefined ||
    correctCount === undefined ||
    wrongCount === undefined ||
    durationSeconds === undefined
  ) {
    return NextResponse.json(
      { error: "categoryId, unitIndex, correctCount, wrongCount, and durationSeconds are required" },
      { status: 400 }
    );
  }

  // 记录表已改为追加式历史日志：优先定位该单元最新一条未完成的记录；
  // 没有未完成的（异常路径，如未先调 start）则退化为更新最新一条
  const record = await prisma.userStudyRecord.findFirst({
    where: {
      userId: appUser.id,
      categoryId: BigInt(categoryId),
      unitIndex,
    },
    orderBy: [{ finishedAt: { sort: "asc", nulls: "first" } }, { startedAt: "desc" }],
  });

  if (record) {
    await prisma.userStudyRecord.update({
      where: { id: record.id },
      data: {
        correctCount,
        wrongCount,
        durationSeconds,
        finishedAt: new Date(),
      },
    });
  }

  // 本次练习的筛选条件（来自 start 创建的学习记录）
  const filter = record
    ? { subjectId: record.subjectId, knowledgePointId: record.knowledgePointId }
    : {};

  // Batch update question progress from answers
  if (answers && Array.isArray(answers)) {
    for (const answer of answers) {
      const { questionId, selectedKeys, isCorrect } = answer;
      if (!questionId) continue;

      await prisma.userQuestionProgress.upsert({
        where: {
          userId_questionId: {
            userId: appUser.id,
            questionId: BigInt(questionId),
          },
        },
        update: {
          lastPracticedAt: new Date(),
          correctCount: { increment: isCorrect ? 1 : 0 },
          wrongCount: { increment: isCorrect ? 0 : 1 },
          status: isCorrect ? "correct" : "wrong",
          ...filter,
        },
        create: {
          userId: appUser.id,
          questionId: BigInt(questionId),
          categoryId: BigInt(categoryId),
          ...filter,
          status: isCorrect ? "correct" : "wrong",
          lastPracticedAt: new Date(),
          correctCount: isCorrect ? 1 : 0,
          wrongCount: isCorrect ? 0 : 1,
        },
      });
    }
  }

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.userDailyStat.upsert({
    where: {
      userId_date: {
        userId: appUser.id,
        date: today,
      },
    },
    update: {
      questionsAnswered: { increment: correctCount + wrongCount },
      unitsCompleted: { increment: 1 },
      studyDuration: { increment: durationSeconds },
    },
    create: {
      userId: appUser.id,
      date: today,
      questionsAnswered: correctCount + wrongCount,
      unitsCompleted: 1,
      studyDuration: durationSeconds,
    },
  });

  return NextResponse.json({ success: true });
}
