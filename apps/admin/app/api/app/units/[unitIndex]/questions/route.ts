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
 * 单元题目（科目必选、分类可选）。
 * 与单元列表使用完全相同的过滤条件与排序，保证题目窗口一致。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitIndex: string }> }
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { unitIndex: unitIndexParam } = await params;

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  if (!subjectIdRaw) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  const categoryIdRaw = url.searchParams.get("categoryId");
  const knowledgePointIdRaw = url.searchParams.get("knowledgePointId");

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;
  const unitIndex = parseInt(unitIndexParam);

  const questionWhere: any = { subjectId: BigInt(subjectIdRaw) };
  if (categoryIdRaw) {
    questionWhere.categoryId = { in: await getAllCategoryIds(BigInt(categoryIdRaw)) };
  }
  if (knowledgePointIdRaw) {
    questionWhere.knowledgePoints = {
      some: { knowledgePointId: BigInt(knowledgePointIdRaw) },
    };
  }

  const questions = await prisma.question.findMany({
    where: questionWhere,
    include: {
      options: {
        orderBy: { sortNo: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    skip: unitIndex * unitSize,
    take: unitSize,
  });

  const questionIds = questions.map((q) => q.id);
  const progress = await prisma.userQuestionProgress.findMany({
    where: {
      userId: appUser.id,
      questionId: { in: questionIds },
    },
  });
  const progressMap = new Map(progress.map((p) => [p.questionId.toString(), p]));

  const serialize = (q: any) => {
    const p = progressMap.get(q.id.toString()) as any;
    return {
      id: q.id.toString(),
      categoryId: q.categoryId.toString(),
      type: q.type,
      content: q.content,
      analysis: q.analysis,
      difficulty: q.difficulty,
      score: q.score,
      sortOrder: q.sortOrder,
      options: q.options.map((o: any) => ({
        id: o.id.toString(),
        questionId: o.questionId.toString(),
        optionKey: o.optionKey,
        content: o.content,
        isCorrect: o.isCorrect,
        sortNo: o.sortNo,
      })),
      progress: p
        ? {
            status: p.status,
            correctCount: p.correctCount,
            wrongCount: p.wrongCount,
          }
        : null,
    };
  };

  return NextResponse.json(questions.map(serialize));
}
