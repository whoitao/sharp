import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 学习记录详情：返回该次练习的错题回顾（题目/选项/解析完整快照） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;

  const attempt = await prisma.studyAttempt.findFirst({
    where: { id, userId: appUser.id },
    include: {
      items: {
        where: { isCorrect: false },
        include: {
          question: {
            include: { options: { orderBy: { sortNo: "asc" } } },
          },
        },
      },
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // StudyAttemptItem 只存 isCorrect，未落库用户所选选项，故不返回 selectedKeys
  const wrongAnswers = attempt.items.map((item) => ({
    question: {
      id: item.question.id.toString(),
      gradeId: item.question.gradeId?.toString() ?? null,
      subjectId: item.question.subjectId?.toString() ?? null,
      chapterId: item.question.chapterId?.toString() ?? null,
      type: item.question.type,
      content: item.question.content,
      analysis: item.question.analysis,
      difficulty: item.question.difficulty,
      score: item.question.score,
      options: item.question.options.map((o) => ({
        id: o.id.toString(),
        questionId: o.questionId.toString(),
        optionKey: o.optionKey,
        content: o.content,
        isCorrect: o.isCorrect,
        sortNo: o.sortNo,
      })),
    },
    correctKeys: item.question.options.filter((o) => o.isCorrect).map((o) => o.optionKey),
  }));

  return NextResponse.json({ wrongAnswers });
}
