import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { chapterQuestionWhere, getChapterKnowledgePointIds } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

/**
 * 教材章节 → 单元列表。
 * 取题口径：章节（含后代）关联的知识点命中的题目，**不按 categoryId 过滤**，
 * 排序沿用 [{sortOrder:'asc'},{id:'asc'}]，保证与题目接口切出的窗口一致。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  const chapterId = BigInt(id);

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10) || 10));

  const settings = await prisma.userSettings.findUnique({ where: { userId: appUser.id } });
  const unitSize = settings?.unitSize ?? 20;

  const kpIds = await getChapterKnowledgePointIds(chapterId);
  const questionWhere = chapterQuestionWhere(kpIds, subjectIdRaw ? BigInt(subjectIdRaw) : null);

  if (!questionWhere) {
    return NextResponse.json({
      chapterId: id,
      unitSize,
      totalQuestions: 0,
      totalUnits: 0,
      page,
      pageSize,
      units: [],
    });
  }

  const [totalQuestions, allQuestions] = await Promise.all([
    prisma.question.count({ where: questionWhere }),
    prisma.question.findMany({
      where: questionWhere,
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  // 进度按题目维度取，章节练习不依赖 categoryId
  const progress = await prisma.userQuestionProgress.findMany({
    where: { userId: appUser.id, questionId: { in: allQuestions.map((q) => q.id) } },
    select: { questionId: true, status: true, correctCount: true },
  });
  const progressMap = new Map(progress.map((p) => [p.questionId.toString(), p]));

  const totalUnits = Math.ceil(totalQuestions / unitSize);
  const allUnits: any[] = [];

  for (let i = 0; i < totalUnits; i += 1) {
    const startIndex = i * unitSize;
    const endIndex = Math.min(startIndex + unitSize, totalQuestions);
    const unitQuestions = allQuestions.slice(startIndex, endIndex);

    let answeredCount = 0;
    let correctCount = 0;
    for (const q of unitQuestions) {
      const p = progressMap.get(q.id.toString());
      if (p && p.status !== "unseen") {
        answeredCount += 1;
        // 按题目最新一次作答结果统计，避免重复学习导致正确率超过 100%
        if (p.status === "correct") correctCount += 1;
      }
    }

    let status: "not_started" | "in_progress" | "completed" = "not_started";
    if (answeredCount === unitQuestions.length && unitQuestions.length > 0) status = "completed";
    else if (answeredCount > 0) status = "in_progress";

    allUnits.push({
      unitIndex: i,
      startIndex,
      endIndex: endIndex - 1,
      totalQuestions: unitQuestions.length,
      answeredCount,
      correctCount,
      status,
    });
  }

  const start = (page - 1) * pageSize;
  const units = allUnits.slice(start, start + pageSize);

  return NextResponse.json({
    chapterId: id,
    unitSize,
    totalQuestions,
    totalUnits,
    page,
    pageSize,
    units,
  });
}
