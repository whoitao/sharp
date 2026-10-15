import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitIndex: string }> }
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id, unitIndex: unitIndexParam } = await params;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;
  const unitIndex = parseInt(unitIndexParam);

  const questions = await prisma.question.findMany({
    where: { categoryId: BigInt(id) },
    include: {
      options: {
        orderBy: { sortNo: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
    skip: unitIndex * unitSize,
    take: unitSize,
  });

  // Get user progress for these questions
  const questionIds = questions.map((q: any) => q.id);
  const progress = await prisma.userQuestionProgress.findMany({
    where: {
      userId: appUser.id,
      questionId: { in: questionIds },
    },
  });

  const progressMap = new Map(
    progress.map((p: any) => [p.questionId.toString(), p])
  );

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
