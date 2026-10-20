import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

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

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  const allCategoryIds = await getAllCategoryIds(BigInt(categoryId));

  // Get questions for this unit (including subcategories)
  const questions = await prisma.question.findMany({
    where: { categoryId: { in: allCategoryIds } },
    orderBy: { sortOrder: "asc" },
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

  // One record per (user, category, unit): re-entering a unit resets it instead of creating a duplicate.
  const record = await prisma.userStudyRecord.upsert({
    where: {
      userId_categoryId_unitIndex: {
        userId: appUser.id,
        categoryId: BigInt(categoryId),
        unitIndex,
      },
    },
    update: {
      startedAt: new Date(),
      finishedAt: null,
      totalQuestions: questions.length,
      correctCount: 0,
      wrongCount: 0,
      durationSeconds: 0,
    },
    create: {
      userId: appUser.id,
      categoryId: BigInt(categoryId),
      unitIndex,
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
      },
      create: {
        userId: appUser.id,
        questionId: q.id,
        categoryId: BigInt(categoryId),
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
