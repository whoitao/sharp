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
  const [questionGroups, chapterGroups] = await Promise.all([
    prisma.question.groupBy({
      by: ["gradeId"],
      where: { subjectId },
      _count: { _all: true },
    }),
    prisma.chapter.groupBy({
      by: ["gradeId"],
      where: { subjectId },
      _count: { _all: true },
    }),
  ]);
  const questionCount = new Map(
    questionGroups.map((g) => [g.gradeId?.toString() ?? "null", g._count._all]),
  );
  const chapterCount = new Map(
    chapterGroups.map((g) => [g.gradeId.toString(), g._count._all]),
  );

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
