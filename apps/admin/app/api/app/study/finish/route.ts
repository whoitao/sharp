import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { gradeId, unitIndex, chapterId, correctCount, wrongCount, durationSeconds, answers, subjectId, knowledgePointId, tagIds } = body;

  const isChapter = chapterId !== undefined && chapterId !== null;

  if (
    unitIndex === undefined ||
    (!isChapter && !subjectId && gradeId == null) ||
    correctCount === undefined ||
    wrongCount === undefined ||
    durationSeconds === undefined
  ) {
    return NextResponse.json(
      { error: "unitIndex, (chapterId or subjectId), correctCount, wrongCount, and durationSeconds are required" },
      { status: 400 }
    );
  }

  // 标签筛选上下文：与 start 保持一致（升序逗号串）
  const tagFilter =
    !isChapter && Array.isArray(tagIds) && tagIds.length > 0
      ? tagIds
          .map((t: unknown) => String(t))
          .sort()
          .join(",")
      : null;

  const kpId = isChapter ? null : knowledgePointId ? BigInt(knowledgePointId) : null;
  const scopeType = isChapter ? "chapter" : kpId ? "knowledge" : "bank";

  const finishedAt = new Date();
  const startedAt = new Date(finishedAt.getTime() - durationSeconds * 1000);

  // 每次完成都追加一条不可变的学习事实；单元只是本次取题的分页窗口，不参与统计
  const items = new Map<string, { questionId: bigint; isCorrect: boolean }>();
  if (answers && Array.isArray(answers)) {
    for (const answer of answers) {
      const { questionId, isCorrect } = answer;
      if (!questionId) continue;
      items.set(String(questionId), { questionId: BigInt(questionId), isCorrect: !!isCorrect });
    }
  }

  await prisma.studyAttempt.create({
    data: {
      userId: appUser.id,
      scopeType,
      gradeId: gradeId ? BigInt(gradeId) : null,
      chapterId: isChapter ? BigInt(chapterId) : null,
      unitIndex,
      subjectId: subjectId ? BigInt(subjectId) : null,
      knowledgePointId: kpId,
      tagFilter,
      totalQuestions: correctCount + wrongCount,
      correctCount,
      wrongCount,
      durationSeconds,
      startedAt,
      finishedAt,
      items: {
        create: Array.from(items.values()).map((item) => ({
          questionId: item.questionId,
          isCorrect: item.isCorrect,
        })),
      },
    },
  });

  // 每题的最新状态是跨次学习的累计数据，继续保留
  const filter = {
    subjectId: subjectId ? BigInt(subjectId) : null,
    knowledgePointId: kpId,
  };

  if (answers && Array.isArray(answers)) {
    for (const answer of answers) {
      const { questionId, isCorrect } = answer;
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
          ...filter,
        },
        create: {
          userId: appUser.id,
          questionId: BigInt(questionId),
          ...filter,
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
      sessionsCompleted: { increment: 1 },
      studyDuration: { increment: durationSeconds },
    },
    create: {
      userId: appUser.id,
      date: today,
      questionsAnswered: correctCount + wrongCount,
      sessionsCompleted: 1,
      studyDuration: durationSeconds,
    },
  });

  return NextResponse.json({ success: true });
}
