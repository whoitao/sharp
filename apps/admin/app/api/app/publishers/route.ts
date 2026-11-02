import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 教材版本列表：返回当前科目/年级下「章节下已录题目」的版本，附题数。
 * 移动端「我的教材」选择器用它展示可切换的版本，无内容的版本不露出。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const gradeId = searchParams.get("gradeId");

  const chapters = await prisma.chapter.findMany({
    where: {
      questions: { some: {} },
      textbook: {
        ...(subjectId ? { subjectId: BigInt(subjectId) } : {}),
        ...(gradeId ? { gradeId: BigInt(gradeId) } : {}),
      },
    },
    select: { id: true, textbook: { select: { publisherId: true } } },
  });

  if (chapters.length === 0) return NextResponse.json({ items: [] });

  const chapterIdsByPublisher = new Map<string, bigint[]>();
  for (const c of chapters) {
    const key = c.textbook.publisherId.toString();
    const list = chapterIdsByPublisher.get(key);
    if (list) list.push(c.id);
    else chapterIdsByPublisher.set(key, [c.id]);
  }

  const publishers = await prisma.publisher.findMany({
    where: { id: { in: [...chapterIdsByPublisher.keys()].map((k) => BigInt(k)) } },
    select: { id: true, name: true },
  });

  const items = await Promise.all(
    publishers.map(async (p) => {
      const chapterIds = chapterIdsByPublisher.get(p.id.toString())!;
      const questionCount = await prisma.question.count({
        where: { chapterId: { in: chapterIds } },
      });
      return { id: p.id.toString(), name: p.name, questionCount };
    }),
  );

  items.sort((a, b) => b.questionCount - a.questionCount);

  return NextResponse.json({ items });
}
