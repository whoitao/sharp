import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { chapterQuestionWhere, getChapterSubtreeIds } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { unitIndex, chapterId } = body;

  const isChapter = chapterId !== undefined && chapterId !== null;

  // 可选筛选：科目 / 知识点 / 年级 / 标签（查询参数），与 units、questions 接口保持一致的过滤口径
  const subjectIdRaw = request.nextUrl.searchParams.get("subjectId");
  const knowledgePointIdRaw = request.nextUrl.searchParams.get("knowledgePointId");
  const gradeIdRaw = request.nextUrl.searchParams.get("gradeId");
  const tagIdsRaw = request.nextUrl.searchParams.get("tagIds");
  const subjectId = subjectIdRaw ? BigInt(subjectIdRaw) : null;
  const gradeId = gradeIdRaw ? BigInt(gradeIdRaw) : null;
  // 标签筛选上下文统一成升序逗号串，保证同样的选择得到同样的记录键
  const tagIds = tagIdsRaw
    ? tagIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s))
    : [];
  const tagFilter =
    tagIds.length > 0
      ? tagIds
          .slice()
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
          .map((t) => t.toString())
          .join(",")
      : null;

  if (unitIndex === undefined || (!isChapter && !subjectId)) {
    return NextResponse.json(
      { error: "unitIndex and (chapterId or subjectId) are required" },
      { status: 400 },
    );
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  // 两种来源的取题口径：
  // - 考纲：科目 + 可选年级/知识点/标签
  // - 教材：章节（含后代）关联知识点命中的题
  let questionWhere: Record<string, unknown>;
  let filter: {
    gradeId: bigint | null;
    chapterId: bigint | null;
    subjectId: bigint | null;
    knowledgePointId: bigint | null;
    tagFilter: string | null;
  };

  if (isChapter) {
    const chapterIds = await getChapterSubtreeIds(BigInt(chapterId));
    const where = chapterQuestionWhere(chapterIds, subjectId);
    if (!where) {
      return NextResponse.json({ error: "No questions found for this chapter" }, { status: 404 });
    }
    questionWhere = where;
    filter = {
      gradeId: null,
      chapterId: BigInt(chapterId),
      subjectId,
      knowledgePointId: null,
      tagFilter: null,
    };
  } else {
    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (knowledgePointIdRaw) {
      where.knowledgePoints = { some: { knowledgePointId: BigInt(knowledgePointIdRaw) } };
    }
    // 年级：历史数据没有年级（null）视为不限年级
    if (gradeId) where.OR = [{ gradeId }, { gradeId: null }];
    // 标签多选：命中任意一个即可，与 units 接口口径一致
    if (tagIds.length > 0) where.tags = { some: { tagId: { in: tagIds } } };
    questionWhere = where;
    filter = {
      gradeId,
      chapterId: null,
      subjectId,
      knowledgePointId: knowledgePointIdRaw ? BigInt(knowledgePointIdRaw) : null,
      tagFilter,
    };
  }

  const questions = await prisma.question.findMany({
    where: questionWhere,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    skip: unitIndex * unitSize,
    take: unitSize,
    select: { id: true },
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
      gradeId: record.gradeId?.toString() ?? null,
      chapterId: record.chapterId?.toString() ?? null,
      unitIndex: record.unitIndex,
      totalQuestions: record.totalQuestions,
      startedAt: record.startedAt,
      previous,
    },
    { status: existing ? 200 : 201 },
  );
}
