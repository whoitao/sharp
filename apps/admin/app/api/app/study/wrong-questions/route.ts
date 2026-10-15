import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  const where = {
    userId: appUser.id,
    status: "wrong",
  };

  const [total, progressRecords] = await Promise.all([
    prisma.userQuestionProgress.count({ where }),
    prisma.userQuestionProgress.findMany({
      where,
      include: {
        question: {
          include: {
            options: { orderBy: { sortNo: "asc" } },
          },
        },
      },
      orderBy: { lastPracticedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const serialized = progressRecords.map((p: any) => ({
    questionId: p.questionId.toString(),
    categoryId: p.categoryId.toString(),
    status: p.status,
    lastPracticedAt: p.lastPracticedAt,
    correctCount: p.correctCount,
    wrongCount: p.wrongCount,
    question: {
      id: p.question.id.toString(),
      categoryId: p.question.categoryId.toString(),
      type: p.question.type,
      content: p.question.content,
      analysis: p.question.analysis,
      difficulty: p.question.difficulty,
      score: p.question.score,
      options: p.question.options.map((o: any) => ({
        id: o.id.toString(),
        questionId: o.questionId.toString(),
        optionKey: o.optionKey,
        content: o.content,
        isCorrect: o.isCorrect,
        sortNo: o.sortNo,
      })),
    },
  }));

  return NextResponse.json({
    data: serialized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
