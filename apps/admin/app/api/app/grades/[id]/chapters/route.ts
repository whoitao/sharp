import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function buildTree(nodes: any[], parentId: string | null): any[] {
  return nodes
    .filter((n) => (n.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id))
    .map((n) => ({
      ...n,
      children: buildTree(nodes, n.id.toString()),
    }));
}

/**
 * 某年级下的教材章节树，按科目与版本过滤。
 * 树根 level=1 是「册」（七年级上册），下面依次是章、节。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  const publisherIdRaw = url.searchParams.get("publisherId");

  const chapters = await prisma.chapter.findMany({
    where: {
      gradeId: BigInt(id),
      subjectId: subjectIdRaw ? BigInt(subjectIdRaw) : undefined,
      publisherId: publisherIdRaw ? BigInt(publisherIdRaw) : undefined,
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
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

  // 聚合题目数：父章节包含所有子章节的题目
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
    gradeId: c.gradeId.toString(),
    subjectId: c.subjectId.toString(),
    publisherId: c.publisherId.toString(),
    parentId: c.parentId?.toString() ?? null,
    level: c.level,
    semester: c.semester ?? null,
    name: c.name,
    sortOrder: c.sortOrder,
    questionCount: aggregate(c.id.toString()),
  }));

  return NextResponse.json(buildTree(serialized, null));
}
