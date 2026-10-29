import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 单元题目（科目必选，年级/知识点/标签可选）。
 * 与单元列表使用完全相同的过滤条件与排序，保证题目窗口一致。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitIndex: string }> }
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { unitIndex: unitIndexParam } = await params;

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  if (!subjectIdRaw) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  const knowledgePointIdRaw = url.searchParams.get("knowledgePointId");
  const gradeIdRaw = url.searchParams.get("gradeId");
  const tagIdsRaw = url.searchParams.get("tagIds");

  const settings = await prisma.userSettings.findUnique({
    where: { userId: appUser.id },
  });
  const unitSize = settings?.unitSize ?? 20;
  const unitIndex = parseInt(unitIndexParam);

  const questionWhere: any = { subjectId: BigInt(subjectIdRaw) };
  if (knowledgePointIdRaw) {
    questionWhere.knowledgePoints = {
      some: { knowledgePointId: BigInt(knowledgePointIdRaw) },
    };
  }
  // 年级：历史数据没有年级（null）视为不限年级，避免存量题被过滤掉
  if (gradeIdRaw) {
    questionWhere.OR = [{ gradeId: BigInt(gradeIdRaw) }, { gradeId: null }];
  }
  // 标签：多选 chips 命中任意一个即可
  const tagIds = tagIdsRaw
    ? tagIdsRaw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => BigInt(s))
    : [];
  if (tagIds.length > 0) {
    questionWhere.tags = { some: { tagId: { in: tagIds } } };
  }

  const questions = await prisma.question.findMany({
    where: questionWhere,
    include: {
      options: {
        orderBy: { sortNo: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    skip: unitIndex * unitSize,
    take: unitSize,
  });

  const questionIds = questions.map((q) => q.id);
  const progress = await prisma.userQuestionProgress.findMany({
    where: {
      userId: appUser.id,
      questionId: { in: questionIds },
    },
  });
  const progressMap = new Map(progress.map((p) => [p.questionId.toString(), p]));

  const serialize = (q: any) => {
    const p = progressMap.get(q.id.toString()) as any;
    return {
      id: q.id.toString(),
      gradeId: q.gradeId?.toString() ?? null,
      subjectId: q.subjectId?.toString() ?? null,
      chapterId: q.chapterId?.toString() ?? null,
      source: q.source,
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
