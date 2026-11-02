import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function buildTree(nodes: any[], parentId: string | null): any[] {
  return nodes
    .filter((n) => (n.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || Number(BigInt(a.id) - BigInt(b.id)))
    .map((n) => ({
      ...n,
      children: buildTree(nodes, n.id),
    }));
}

/** 「我的教材」某本教材的章节树（含后代题目数） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  const textbookId = BigInt(id);

  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true },
  });
  if (!textbook) return NextResponse.json({ error: "textbook not found" }, { status: 404 });

  const chapters = await prisma.chapter.findMany({
    where: { textbookId },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, textbookId: true, parentId: true, level: true, name: true, sortOrder: true },
  });

  const chapterIds = chapters.map((c) => c.id);
  const questionGroups = chapterIds.length
    ? await prisma.question.groupBy({
        by: ["chapterId"],
        where: { chapterId: { in: chapterIds } },
        _count: { _all: true },
      })
    : [];
  const directCount = new Map<string, number>();
  for (const g of questionGroups) {
    if (g.chapterId != null) directCount.set(g.chapterId.toString(), g._count._all);
  }

  const childrenMap = new Map<string, string[]>();
  for (const c of chapters) {
    const key = c.parentId?.toString() ?? "root";
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(c.id.toString());
  }
  const aggregate = (cid: string): number => {
    let total = directCount.get(cid) ?? 0;
    for (const child of childrenMap.get(cid) ?? []) total += aggregate(child);
    return total;
  };

  const serialized = chapters.map((c) => ({
    id: c.id.toString(),
    textbookId: c.textbookId.toString(),
    parentId: c.parentId?.toString() ?? null,
    level: c.level,
    name: c.name,
    sortOrder: c.sortOrder,
    questionCount: aggregate(c.id.toString()),
  }));

  return NextResponse.json(buildTree(serialized, null));
}
