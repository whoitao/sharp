import { getKnowledgePointSubtreeIds } from "@/lib/knowledge-point";
import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { applyScopeFilter, chapterQuestionWhere, getChapterSubtreeIds } from "@/lib/textbook";
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
  const publisherIdRaw = request.nextUrl.searchParams.get("publisherId");
  const tagIdsRaw = request.nextUrl.searchParams.get("tagIds");
  const subjectId = subjectIdRaw ? BigInt(subjectIdRaw) : null;
  const gradeId = gradeIdRaw ? BigInt(gradeIdRaw) : null;
  const publisherId = publisherIdRaw ? BigInt(publisherIdRaw) : null;
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
      // 选中父级知识点时命中整个子树的题目
      const kpIds = await getKnowledgePointSubtreeIds(BigInt(knowledgePointIdRaw));
      where.knowledgePoints = { some: { knowledgePointId: { in: kpIds } } };
    }
    // 年级 / 教材版本：公共口径（年级 null 视为不限；教材版本不误伤无章节的真题/词汇题）
    applyScopeFilter(where, { gradeId, publisherId });
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

  // 历史不可变：只查最近一次已完成的同单元同筛选学习事实，用于展示「上次学习」。
  // 不再创建/重置记录，本次学习在 finish 时追加新的一条。
  const previousAttempt = await prisma.studyAttempt.findFirst({
    where: {
      userId: appUser.id,
      unitIndex,
      scopeType: isChapter ? "chapter" : filter.knowledgePointId ? "knowledge" : "bank",
      chapterId: filter.chapterId,
      subjectId: filter.subjectId,
      knowledgePointId: filter.knowledgePointId,
      gradeId: filter.gradeId,
      tagFilter: filter.tagFilter,
    },
    orderBy: { finishedAt: "desc" },
  });

  const previous = previousAttempt
    ? {
        finishedAt: previousAttempt.finishedAt,
        totalQuestions: previousAttempt.totalQuestions,
        correctCount: previousAttempt.correctCount,
        wrongCount: previousAttempt.wrongCount,
        durationSeconds: previousAttempt.durationSeconds,
      }
    : null;

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

  return NextResponse.json({
    id: previousAttempt?.id ?? null,
    gradeId: filter.gradeId?.toString() ?? null,
    chapterId: filter.chapterId?.toString() ?? null,
    unitIndex,
    totalQuestions: questions.length,
    startedAt: new Date(),
    previous,
  });
}
