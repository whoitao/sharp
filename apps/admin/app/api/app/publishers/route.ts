import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 教材版本列表：返回当前科目/年级下「教材已有章节」的版本，附题数。
 * 口径与 /api/app/textbooks 一致：只要求教材有章节，0 题的教材同样可以选中。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const gradeId = searchParams.get("gradeId");

  const textbooks = await prisma.textbook.findMany({
    where: {
      chapters: { some: {} },
      ...(subjectId ? { subjectId: BigInt(subjectId) } : {}),
      ...(gradeId ? { gradeId: BigInt(gradeId) } : {}),
    },
    select: { id: true, publisherId: true },
  });

  if (textbooks.length === 0) return NextResponse.json({ items: [] });

  const textbookIdsByPublisher = new Map<string, bigint[]>();
  for (const t of textbooks) {
    const key = t.publisherId.toString();
    const list = textbookIdsByPublisher.get(key);
    if (list) list.push(t.id);
    else textbookIdsByPublisher.set(key, [t.id]);
  }

  const publishers = await prisma.publisher.findMany({
    where: { id: { in: [...textbookIdsByPublisher.keys()].map((k) => BigInt(k)) } },
    select: { id: true, name: true },
  });

  const items = await Promise.all(
    publishers.map(async (p) => {
      const textbookIds = textbookIdsByPublisher.get(p.id.toString())!;
      const questionCount = await prisma.question.count({
        where: { chapter: { textbookId: { in: textbookIds } } },
      });
      return { id: p.id.toString(), name: p.name, questionCount };
    }),
  );

  items.sort((a, b) => b.questionCount - a.questionCount);

  return NextResponse.json({ items });
}
