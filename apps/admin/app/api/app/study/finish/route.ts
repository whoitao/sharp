import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex, correctCount, wrongCount, durationSeconds } = body;

  if (
    categoryId === undefined ||
    unitIndex === undefined ||
    correctCount === undefined ||
    wrongCount === undefined ||
    durationSeconds === undefined
  ) {
    return NextResponse.json(
      { error: "categoryId, unitIndex, correctCount, wrongCount, and durationSeconds are required" },
      { status: 400 }
    );
  }

  // Find the most recent study record for this session
  const record = await prisma.userStudyRecord.findFirst({
    where: {
      userId: appUser.id,
      categoryId: BigInt(categoryId),
      unitIndex,
      finishedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (record) {
    await prisma.userStudyRecord.update({
      where: { id: record.id },
      data: {
        correctCount,
        wrongCount,
        durationSeconds,
        finishedAt: new Date(),
      },
    });
  }

  // Update daily stats for unit completion
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.userDailyStat.upsert({
    where: {
      userId_date: {
        userId: appUser.id,
        date: today,
      },
    },
    update: {
      unitsCompleted: { increment: 1 },
      studyDuration: { increment: durationSeconds },
    },
    create: {
      userId: appUser.id,
      date: today,
      unitsCompleted: 1,
      studyDuration: durationSeconds,
    },
  });

  return NextResponse.json({ success: true });
}
