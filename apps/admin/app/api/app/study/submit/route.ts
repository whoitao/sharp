import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { questionId, selectedKeys } = body;

  if (questionId === undefined || !selectedKeys || !Array.isArray(selectedKeys)) {
    return NextResponse.json(
      { error: "questionId and selectedKeys are required" },
      { status: 400 }
    );
  }

  // Get the question with correct options
  const question = await prisma.question.findUnique({
    where: { id: BigInt(questionId) },
    include: { options: true },
  });

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  const correctKeys = question.options
    .filter((o: any) => o.isCorrect)
    .map((o: any) => o.optionKey)
    .sort();

  const submittedKeys = [...selectedKeys].sort();
  const isCorrect =
    correctKeys.length === submittedKeys.length &&
    correctKeys.every((k: string, i: number) => k === submittedKeys[i]);

  // Update progress
  const progress = await prisma.userQuestionProgress.upsert({
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
      subjectId: question.subjectId,
      status: isCorrect ? "correct" : "wrong",
      lastPracticedAt: new Date(),
      correctCount: isCorrect ? 1 : 0,
      wrongCount: isCorrect ? 0 : 1,
    },
  });

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
      questionsAnswered: { increment: 1 },
    },
    create: {
      userId: appUser.id,
      date: today,
      questionsAnswered: 1,
    },
  });

  return NextResponse.json({
    isCorrect,
    correctKeys,
    analysis: question.analysis,
    progress: {
      status: progress.status,
      correctCount: progress.correctCount,
      wrongCount: progress.wrongCount,
    },
  });
}
