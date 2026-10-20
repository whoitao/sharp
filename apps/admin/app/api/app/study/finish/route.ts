import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex, correctCount, wrongCount, durationSeconds, answers } = body;

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

  // Find the study record for this (user, category, unit).
  // A unique constraint guarantees at most one record, so we don't filter by
  // finishedAt — re-practicing a finished unit ("再练一次") must overwrite it.
  const record = await prisma.userStudyRecord.findUnique({
    where: {
      userId_categoryId_unitIndex: {
        userId: appUser.id,
        categoryId: BigInt(categoryId),
        unitIndex,
      },
    },
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

  // Batch update question progress from answers
  if (answers && Array.isArray(answers)) {
    for (const answer of answers) {
      const { questionId, selectedKeys, isCorrect } = answer;
      if (!questionId) continue;

      await prisma.userQuestionProgress.upsert({
        where: {
          userId_questionId: {
            userId: appUser.id,
            questionId: BigInt(questionId),
          },
        },
        update: {
          lastPracticedAt: new Date(),
          correctCount: { increment: isCorrect ? 1 : 0 },
          wrongCount: { increment: isCorrect ? 0 : 1 },
          status: isCorrect ? "correct" : "wrong",
        },
        create: {
          userId: appUser.id,
          questionId: BigInt(questionId),
          categoryId: BigInt(categoryId),
          status: isCorrect ? "correct" : "wrong",
          lastPracticedAt: new Date(),
          correctCount: isCorrect ? 1 : 0,
          wrongCount: isCorrect ? 0 : 1,
        },
      });
    }
  }

  // Update daily stats
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
      questionsAnswered: { increment: correctCount + wrongCount },
      unitsCompleted: { increment: 1 },
      studyDuration: { increment: durationSeconds },
    },
    create: {
      userId: appUser.id,
      date: today,
      questionsAnswered: correctCount + wrongCount,
      unitsCompleted: 1,
      studyDuration: durationSeconds,
    },
  });

  return NextResponse.json({ success: true });
}
