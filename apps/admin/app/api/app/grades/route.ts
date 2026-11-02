import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 年级字典（全局选择器用）。
 * 可选 subjectId：同时返回该科目下各年级的题目数与教材章节数，方便移动端只展示有内容的年级。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");

  const grades = await prisma.grade.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { stage: { select: { id: true, name: true } } },
  });

  if (!subjectIdRaw) {
    return NextResponse.json(
      grades.map((g) => ({
        id: g.id.toString(),
        name: g.name,
        stageId: g.stage.id.toString(),
        stage: g.stage.name,
        sortOrder: g.sortOrder,
      })),
    );
  }

  const subjectId = BigInt(subjectIdRaw);
  const [questionGroups, textbooks] = await Promise.all([
    prisma.question.groupBy({
      by: ["gradeId"],
      where: { subjectId },
      _count: { _all: true },
    }),
    // 章节已归属教材，年级的章节数按教材聚合
    prisma.textbook.findMany({
      where: { subjectId },
      select: { gradeId: true, _count: { select: { chapters: true } } },
    }),
  ]);
  const questionCount = new Map(
    questionGroups.map((g) => [g.gradeId?.toString() ?? "null", g._count._all]),
  );
  const chapterCount = new Map<string, number>();
  for (const t of textbooks) {
    const key = t.gradeId.toString();
    chapterCount.set(key, (chapterCount.get(key) ?? 0) + t._count.chapters);
  }

  return NextResponse.json(
    grades.map((g) => ({
      id: g.id.toString(),
      name: g.name,
      stageId: g.stage.id.toString(),
      stage: g.stage.name,
      sortOrder: g.sortOrder,
      questionCount: questionCount.get(g.id.toString()) ?? 0,
      chapterCount: chapterCount.get(g.id.toString()) ?? 0,
    })),
  );
}
