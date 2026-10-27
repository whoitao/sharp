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

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex } = body;

  if (categoryId === undefined || unitIndex === undefined) {
    return NextResponse.json(
      { error: "categoryId and unitIndex are required" },
      { status: 400 }
    );
  }

  // 可选筛选：科目 / 知识点（查询参数），与 units、questions 接口保持一致的过滤口径
  const subjectIdRaw = request.nextUrl.searchParams.get("subjectId");
  const knowledgePointIdRaw = request.nextUrl.searchParams.get("knowledgePointId");

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  const allCategoryIds = await getAllCategoryIds(BigInt(categoryId));

  // Get questions for this unit (including subcategories), 科目/知识点筛选与 units 接口一致
  const questionWhere: Record<string, unknown> = {
    categoryId: { in: allCategoryIds },
  };
  if (subjectIdRaw) {
    questionWhere.subjectId = BigInt(subjectIdRaw);
  }
  if (knowledgePointIdRaw) {
    questionWhere.knowledgePoints = {
      some: { knowledgePointId: BigInt(knowledgePointIdRaw) },
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
    return NextResponse.json(
      { error: "No questions found for this unit" },
      { status: 404 }
    );
  }

  // 每次开始学习都新建一条记录（历史日志），写入当时的筛选条件
  const record = await prisma.userStudyRecord.create({
    data: {
      userId: appUser.id,
      categoryId: BigInt(categoryId),
      unitIndex,
      subjectId: subjectIdRaw ? BigInt(subjectIdRaw) : null,
      knowledgePointId: knowledgePointIdRaw ? BigInt(knowledgePointIdRaw) : null,
      totalQuestions: questions.length,
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
        subjectId: subjectIdRaw ? BigInt(subjectIdRaw) : null,
        knowledgePointId: knowledgePointIdRaw ? BigInt(knowledgePointIdRaw) : null,
      },
      create: {
        userId: appUser.id,
        questionId: q.id,
        categoryId: BigInt(categoryId),
        subjectId: subjectIdRaw ? BigInt(subjectIdRaw) : null,
        knowledgePointId: knowledgePointIdRaw ? BigInt(knowledgePointIdRaw) : null,
        status: "unseen",
        lastPracticedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    id: record.id,
    categoryId: record.categoryId.toString(),
    unitIndex: record.unitIndex,
    totalQuestions: record.totalQuestions,
    startedAt: record.startedAt,
  }, { status: 201 });
}
