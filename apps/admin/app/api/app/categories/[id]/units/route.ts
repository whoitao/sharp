import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;

  // Get user settings for unit size
  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;

  // Count total questions in this category
  const totalQuestions = await prisma.question.count({
    where: { categoryId: BigInt(id) },
  });

  // Get progress for this user and category
  const progress = await prisma.userQuestionProgress.findMany({
    where: {
      userId: appUser.id,
      categoryId: BigInt(id),
    },
    select: { questionId: true, status: true, correctCount: true },
  });

  const progressMap = new Map(
    progress.map((p) => [p.questionId.toString(), p])
  );

  // Get all question IDs in order
  const allQuestions = await prisma.question.findMany({
    where: { categoryId: BigInt(id) },
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
      const p = progressMap.get(q.id.toString());
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
