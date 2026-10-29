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
    select: { id: true, subjectId: true, gradeId: true, publisherId: true },
  });

  if (chaptersWithQuestions.length === 0) return NextResponse.json({ subjects: [] });

  const subjects = await prisma.subject.findMany({
    where: {
      id: { in: [...new Set(chaptersWithQuestions.map((c) => c.subjectId.toString()))].map((s) => BigInt(s)) },
    },
    select: { id: true, name: true },
  });
  const subjectName = new Map(subjects.map((s) => [s.id.toString(), s.name]));

  const bySubject = new Map<
    string,
    { publisherIds: Set<string>; gradeIds: Set<string>; chapterCount: number }
  >();
  for (const c of chaptersWithQuestions) {
    const subjectId = c.subjectId.toString();
    const entry =
      bySubject.get(subjectId) ??
      { publisherIds: new Set<string>(), gradeIds: new Set<string>(), chapterCount: 0 };
    entry.publisherIds.add(c.publisherId.toString());
    entry.gradeIds.add(c.gradeId.toString());
    entry.chapterCount += 1;
    bySubject.set(subjectId, entry);
  }

  return NextResponse.json({
    subjects: [...bySubject.entries()].map(([subjectId, v]) => ({
      subjectId,
      subjectName: subjectName.get(subjectId) ?? "",
      publisherCount: v.publisherIds.size,
      publisherIds: [...v.publisherIds],
      gradeIds: [...v.gradeIds],
      chapterCount: v.chapterCount,
    })),
  });
}
