import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex, chapterId, correctCount, wrongCount, durationSeconds, answers, subjectId, knowledgePointId } = body;

  const isChapter = chapterId !== undefined && chapterId !== null;

  if (
    unitIndex === undefined ||
    (categoryId === undefined && !isChapter) ||
    correctCount === undefined ||
    wrongCount === undefined ||
    durationSeconds === undefined
  ) {
    return NextResponse.json(
      { error: "unitIndex, (categoryId or chapterId), correctCount, wrongCount, and durationSeconds are required" },
      { status: 400 }
    );
  }

  // 客户端会带上本次的筛选条件：同一单元在不同筛选下各有一条记录，必须按完整键定位。
  // 没带（旧版本客户端）或定位不到时退化为「该单元最新一条」。
  const filterWhere =
    subjectId !== undefined || knowledgePointId !== undefined
      ? {
          subjectId: subjectId ? BigInt(subjectId) : null,
          knowledgePointId: knowledgePointId ? BigInt(knowledgePointId) : null,
        }
      : null;

  const recordWhere = {
    userId: appUser.id,
    categoryId: isChapter ? null : BigInt(categoryId),
    chapterId: isChapter ? BigInt(chapterId) : null,
    unitIndex,
  };

  const record =
    (await prisma.userStudyRecord.findFirst({
      where: filterWhere ? { ...recordWhere, ...filterWhere } : recordWhere,
      orderBy: [{ finishedAt: { sort: "asc", nulls: "first" } }, { startedAt: "desc" }],
    })) ??
    (filterWhere
      ? await prisma.userStudyRecord.findFirst({
          where: recordWhere,
          orderBy: [{ finishedAt: { sort: "asc", nulls: "first" } }, { startedAt: "desc" }],
        })
      : null);

  if (record) {
    // 同一单元只有一条记录，重复学习后要覆盖成最新一次的时间与成绩：
    // startedAt 由本次用时反推，保证学习记录列表按最近一次学习时间排序、展示
    const finishedAt = new Date();
    await prisma.userStudyRecord.update({
      where: { id: record.id },
      data: {
        correctCount,
        wrongCount,
        durationSeconds,
        startedAt: new Date(finishedAt.getTime() - durationSeconds * 1000),
        finishedAt,
      },
    });
  }

  // 本次练习的筛选条件：优先用记录上的值，记录缺失时用客户端传来的
  const filter = record
    ? { subjectId: record.subjectId, knowledgePointId: record.knowledgePointId }
    : (filterWhere ?? {});

  // Batch update question progress from answers
  // 进度上的 categoryId 必填：教材章节练习跨分类，取每道题自身的分类；
  // 考纲练习沿用学习时选择的分类，保持历史口径不变。
  const questionCategoryMap = new Map<string, bigint>();
  if (isChapter && answers && Array.isArray(answers)) {
    const answeredIds = answers
      .filter((a: any) => a?.questionId)
      .map((a: any) => BigInt(a.questionId));
    if (answeredIds.length > 0) {
      const rows = await prisma.question.findMany({
        where: { id: { in: answeredIds } },
        select: { id: true, categoryId: true },
      });
      for (const row of rows) questionCategoryMap.set(row.id.toString(), row.categoryId);
    }
  }

  if (answers && Array.isArray(answers)) {
    for (const answer of answers) {
      const { questionId, selectedKeys, isCorrect } = answer;
      if (!questionId) continue;

      const progressCategoryId = isChapter
        ? questionCategoryMap.get(String(questionId))
        : BigInt(categoryId);
      // 题目被删除或取不到分类时跳过，避免写入非法外键
      if (progressCategoryId == null) continue;

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
          categoryId: progressCategoryId,
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
