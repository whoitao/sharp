import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
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

/**
 * 单元列表（科目必选、分类可选）。
 * 不选分类时聚合该科目下的全部题目，选中分类时按分类子树取题。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  if (!subjectIdRaw) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const categoryIdRaw = url.searchParams.get("categoryId");
  const knowledgePointIdRaw = url.searchParams.get("knowledgePointId");
  const gradeIdRaw = url.searchParams.get("gradeId");
  const tagIdsRaw = url.searchParams.get("tagIds");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10) || 10));

  const questionWhere: any = { subjectId: BigInt(subjectIdRaw) };
  if (categoryIdRaw) {
    questionWhere.categoryId = { in: await getAllCategoryIds(BigInt(categoryIdRaw)) };
  }
  if (knowledgePointIdRaw) {
    questionWhere.knowledgePoints = {
      some: { knowledgePointId: BigInt(knowledgePointIdRaw) },
    };
  }
  // 年级：历史数据没有年级（null）视为不限年级，避免存量题被过滤掉
  if (gradeIdRaw) {
    questionWhere.OR = [{ gradeId: BigInt(gradeIdRaw) }, { gradeId: null }];
  }
  // 标签：多选 chips 命中任意一个即可
  const tagIds = tagIdsRaw
    ? tagIdsRaw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => BigInt(s))
    : [];
  if (tagIds.length > 0) {
    questionWhere.tags = { some: { tagId: { in: tagIds } } };
  }

  // Get user settings for unit size
  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  const totalQuestions = await prisma.question.count({ where: questionWhere });

  // 进度只按本次涉及到的分类取，避免用几千个题目 ID 拼查询条件
  const categoryGroups = await prisma.question.groupBy({
    by: ["categoryId"],
    where: questionWhere,
  });
  const progress = await prisma.userQuestionProgress.findMany({
    where: {
      userId: appUser.id,
      categoryId: { in: categoryGroups.map((g) => g.categoryId) },
    },
    select: { questionId: true, status: true },
  });
  const progressMap = new Map(progress.map((p) => [p.questionId.toString(), p]));

  const allQuestions = await prisma.question.findMany({
    where: questionWhere,
    select: { id: true },
    // sortOrder 存在大量并列，必须加 id 决胜保证单元窗口跨接口稳定
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const totalUnits = Math.ceil(totalQuestions / unitSize);
  const allUnits: any[] = [];

  for (let i = 0; i < totalUnits; i++) {
    const startIndex = i * unitSize;
    const endIndex = Math.min(startIndex + unitSize, totalQuestions);
    const unitQuestions = allQuestions.slice(startIndex, endIndex);

    let answeredCount = 0;
    let correctCount = 0;

    for (const q of unitQuestions) {
      const p = progressMap.get(q.id.toString());
      if (p && p.status !== "unseen") {
        answeredCount++;
        // 按题目最新一次作答结果统计，避免同一题多次学习重复累加导致正确率超过 100%
        if (p.status === "correct") correctCount++;
      }
    }

    let status: "not_started" | "in_progress" | "completed" = "not_started";
    if (answeredCount === unitQuestions.length && unitQuestions.length > 0) {
      status = "completed";
    } else if (answeredCount > 0) {
      status = "in_progress";
    }

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
    subjectId: subjectIdRaw,
    categoryId: categoryIdRaw,
    gradeId: gradeIdRaw,
    tagIds: tagIds.map((t) => t.toString()),
    unitSize,
    totalQuestions,
    totalUnits,
    page,
    pageSize,
    units,
  });
}
