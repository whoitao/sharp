import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { chapterQuestionWhere, getChapterSubtreeIds } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

async function getAllCategoryIds(categoryId: bigint): Promise<bigint[]> {
  const ids: bigint[] = [categoryId];
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  for (const child of children) {
    const childIds = await getAllCategoryIds(child.id);
    ids.push(...childIds);
  }
  return ids;
}

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex, chapterId } = body;

  const isChapter = chapterId !== undefined && chapterId !== null;
  if (unitIndex === undefined || (categoryId === undefined && !isChapter)) {
    return NextResponse.json(
      { error: "unitIndex and (categoryId or chapterId) are required" },
      { status: 400 },
    );
  }

  // 可选筛选：科目 / 知识点（查询参数），与 units、questions 接口保持一致的过滤口径
  const subjectIdRaw = request.nextUrl.searchParams.get("subjectId");
  const knowledgePointIdRaw = request.nextUrl.searchParams.get("knowledgePointId");

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  const subjectId = subjectIdRaw ? BigInt(subjectIdRaw) : null;

  // 两种来源的取题口径：
  // - 考纲：分类子树 + 可选科目/知识点
  // - 教材：章节（含后代）关联知识点命中的题，不按分类过滤
  let questionWhere: Record<string, unknown>;
  let filter: {
    categoryId: bigint | null;
    chapterId: bigint | null;
    subjectId: bigint | null;
    knowledgePointId: bigint | null;
  };

  if (isChapter) {
    const chapterIds = await getChapterSubtreeIds(BigInt(chapterId));
    const where = chapterQuestionWhere(chapterIds, subjectId);
    if (!where) {
      return NextResponse.json({ error: "No questions found for this chapter" }, { status: 404 });
    }
    questionWhere = where;
    filter = { categoryId: null, chapterId: BigInt(chapterId), subjectId, knowledgePointId: null };
  } else {
    const allCategoryIds = await getAllCategoryIds(BigInt(categoryId));
    questionWhere = { categoryId: { in: allCategoryIds } };
    if (subjectId) questionWhere.subjectId = subjectId;
    if (knowledgePointIdRaw) {
      questionWhere.knowledgePoints = { some: { knowledgePointId: BigInt(knowledgePointIdRaw) } };
    }
    filter = {
      categoryId: BigInt(categoryId),
      chapterId: null,
      subjectId,
      knowledgePointId: knowledgePointIdRaw ? BigInt(knowledgePointIdRaw) : null,
    };
  }

  const questions = await prisma.question.findMany({
    where: questionWhere,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    skip: unitIndex * unitSize,
    take: unitSize,
    select: { id: true, categoryId: true },
  });

  if (questions.length === 0) {
    return NextResponse.json({ error: "No questions found for this unit" }, { status: 404 });
  }

  // 同一单元 + 同一组筛选条件只保留一条记录：
  // 已完成的记录原样保留并回传给客户端展示「上次学习」，未完成的记录重置为本次作答
  // 优先保留最近一次已完成的记录（展示「上次学习」更有意义），没有时才用最近的未完成记录
  const candidates = await prisma.userStudyRecord.findMany({
    where: { userId: appUser.id, unitIndex, ...filter },
    orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, { startedAt: "desc" }],
  });
  const existing = candidates[0] ?? null;

  // 历史版本是每次进入都追加一条记录，可能残留多条；这里顺手清掉多余的行，保证一单元一条
  if (candidates.length > 1) {
    await prisma.userStudyRecord.deleteMany({
      where: { id: { in: candidates.slice(1).map((r) => r.id) } },
    });
  }

  const previous = existing?.finishedAt
    ? {
        finishedAt: existing.finishedAt,
        totalQuestions: existing.totalQuestions,
        correctCount: existing.correctCount,
        wrongCount: existing.wrongCount,
        durationSeconds: existing.durationSeconds,
      }
    : null;

  const record = existing
    ? await prisma.userStudyRecord.update({
        where: { id: existing.id },
        data: previous
          ? { totalQuestions: questions.length }
          : {
              totalQuestions: questions.length,
              startedAt: new Date(),
              finishedAt: null,
              correctCount: 0,
              wrongCount: 0,
              durationSeconds: 0,
            },
      })
    : await prisma.userStudyRecord.create({
        data: {
          userId: appUser.id,
          unitIndex,
          totalQuestions: questions.length,
          ...filter,
        },
      });

  // Mark questions as seen (upsert progress)
  // 进度上的 categoryId 用题目自身的分类：教材章节练习跨分类，取不到统一分类
  for (const q of questions) {
    await prisma.userQuestionProgress.upsert({
      where: {
        userId_questionId: {
          userId: appUser.id,
          questionId: q.id,
        },
      },
      update: {
        lastPracticedAt: new Date(),
        subjectId,
        knowledgePointId: filter.knowledgePointId,
      },
      create: {
        userId: appUser.id,
        questionId: q.id,
        categoryId: isChapter ? q.categoryId : BigInt(categoryId),
        subjectId,
        knowledgePointId: filter.knowledgePointId,
        status: "unseen",
        lastPracticedAt: new Date(),
      },
    });
  }

  return NextResponse.json(
    {
      id: record.id,
      categoryId: record.categoryId?.toString() ?? null,
      chapterId: record.chapterId?.toString() ?? null,
      unitIndex: record.unitIndex,
      totalQuestions: record.totalQuestions,
      startedAt: record.startedAt,
      previous,
    },
    { status: existing ? 200 : 201 },
  );
}
