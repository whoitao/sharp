import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 教材练习可用性：只返回「已经有章节且章节下已录题目」的科目。
 * 移动端用它决定是否显示「按教材练习」入口 —— 数据没填完的科目不露出空入口。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const chaptersWithQuestions = await prisma.chapter.findMany({
    where: { questions: { some: {} } },
    select: { id: true, gradeId: true, publisherId: true },
  });

  if (chaptersWithQuestions.length === 0) return NextResponse.json({ subjects: [] });

  const gradeIds = [...new Set(chaptersWithQuestions.map((c) => c.gradeId.toString()))].map((s) => BigInt(s));
  const grades = await prisma.grade.findMany({
    where: { id: { in: gradeIds } },
    select: { id: true, subjectId: true, subject: { select: { name: true } } },
  });
  const gradeSubject = new Map(grades.map((g) => [g.id.toString(), g.subjectId.toString()]));
  const subjectNames = new Map(grades.map((g) => [g.subjectId.toString(), g.subject.name]));

  const bySubject = new Map<string, { publisherIds: Set<string>; chapterCount: number }>();
  for (const c of chaptersWithQuestions) {
    const subjectId = gradeSubject.get(c.gradeId.toString());
    if (!subjectId) continue;
    const entry = bySubject.get(subjectId) ?? { publisherIds: new Set<string>(), chapterCount: 0 };
    if (c.publisherId != null) entry.publisherIds.add(c.publisherId.toString());
    entry.chapterCount += 1;
    bySubject.set(subjectId, entry);
  }

  const subjects = [...bySubject.entries()].map(([subjectId, v]) => ({
    subjectId,
    subjectName: subjectNames.get(subjectId) ?? "",
    publisherCount: v.publisherIds.size,
    chapterCount: v.chapterCount,
  }));

  return NextResponse.json({ subjects });
}
