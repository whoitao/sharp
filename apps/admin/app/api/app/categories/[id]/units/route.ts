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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  const categoryId = BigInt(id);

  // 可选过滤：科目 / 知识点
  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  const knowledgePointIdRaw = url.searchParams.get("knowledgePointId");

  // Get all category IDs (this category + all subcategories)
  const allCategoryIds = await getAllCategoryIds(categoryId);

  const questionWhere: any = { categoryId: { in: allCategoryIds } };
  if (subjectIdRaw) {
    questionWhere.subjectId = BigInt(subjectIdRaw);
  }
  if (knowledgePointIdRaw) {
    questionWhere.knowledgePoints = {
      some: { knowledgePointId: BigInt(knowledgePointIdRaw) },
    };
  }

  // Get user settings for unit size
  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  // Count total questions in this category and all subcategories
  const totalQuestions = await prisma.question.count({
    where: questionWhere,
  });

  // Get progress for this user across all subcategories
  const progress = await prisma.userQuestionProgress.findMany({
    where: {
      userId: appUser.id,
      categoryId: { in: allCategoryIds },
    },
    select: { questionId: true, status: true, correctCount: true },
  });

  const progressMap = new Map(
    progress.map((p: any) => [p.questionId.toString(), p])
  );

  // Get all question IDs in order
  const allQuestions = await prisma.question.findMany({
    where: questionWhere,
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  // Calculate units
  const totalUnits = Math.ceil(totalQuestions / unitSize);
  const units = [];

  for (let i = 0; i < totalUnits; i++) {
    const startIndex = i * unitSize;
    const endIndex = Math.min(startIndex + unitSize, totalQuestions);
    const unitQuestions = allQuestions.slice(startIndex, endIndex);

    let answeredCount = 0;
    let correctCount = 0;

    for (const q of unitQuestions) {
      const p = progressMap.get(q.id.toString()) as any;
      if (p && p.status !== "unseen") {
        answeredCount++;
        correctCount += p.correctCount;
      }
    }

    let status: "not_started" | "in_progress" | "completed" = "not_started";
    if (answeredCount === unitQuestions.length && unitQuestions.length > 0) {
      status = "completed";
    } else if (answeredCount > 0) {
      status = "in_progress";
    }

    units.push({
      unitIndex: i,
      startIndex,
      endIndex: endIndex - 1,
      totalQuestions: unitQuestions.length,
      answeredCount,
      correctCount,
      status,
    });
  }

  return NextResponse.json({
    categoryId: id,
    unitSize,
    totalQuestions,
    totalUnits,
    units,
  });
}
