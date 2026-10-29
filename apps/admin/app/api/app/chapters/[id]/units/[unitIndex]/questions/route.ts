import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { chapterQuestionWhere, getChapterSubtreeIds } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

/** 教材章节某个单元的题目（口径与 units 接口完全一致） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitIndex: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id, unitIndex: unitIndexParam } = await params;
  const chapterId = BigInt(id);
  const unitIndex = parseInt(unitIndexParam, 10);

  if (Number.isNaN(unitIndex) || unitIndex < 0) {
    return NextResponse.json({ error: "invalid unitIndex" }, { status: 400 });
  }

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");

  const settings = await prisma.userSettings.findUnique({ where: { userId: appUser.id } });
  const unitSize = settings?.unitSize ?? 20;

  const chapterIds = await getChapterSubtreeIds(chapterId);
  const questionWhere = chapterQuestionWhere(chapterIds, subjectIdRaw ? BigInt(subjectIdRaw) : null);

  if (!questionWhere) return NextResponse.json([]);

  const questions = await prisma.question.findMany({
    where: questionWhere,
    include: { options: { orderBy: { sortNo: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    skip: unitIndex * unitSize,
    take: unitSize,
  });

  const questionIds = questions.map((q) => q.id);
  const progress = await prisma.userQuestionProgress.findMany({
    where: { userId: appUser.id, questionId: { in: questionIds } },
  });
  const progressMap = new Map(progress.map((p) => [p.questionId.toString(), p]));

  const serialize = (q: any) => {
    const p = progressMap.get(q.id.toString());
    return {
      id: q.id.toString(),
      gradeId: q.gradeId?.toString() ?? null,
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
