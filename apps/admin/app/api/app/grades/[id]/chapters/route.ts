import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 某个年级下的章节树，附带每个章节（含后代章节）的题目数。
 * 题目归属以 Question.chapterId 为准，一次查出本年级所有题目后自底向上累加，
 * 避免逐节点 count 查询。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { id } = await params;
  const gradeId = BigInt(id);
  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");

  const chapters = await prisma.chapter.findMany({
    where: { gradeId },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });

  if (chapters.length === 0) return NextResponse.json([]);

  const questionWhere: Record<string, unknown> = {
    chapterId: { in: chapters.map((c) => c.id) },
  };
  if (subjectIdRaw) questionWhere.subjectId = BigInt(subjectIdRaw);

  const questions = await prisma.question.findMany({
    where: questionWhere,
    select: { chapterId: true },
  });

  // 直属题数
  const directCount = new Map<string, number>();
  for (const q of questions) {
    const key = q.chapterId?.toString();
    if (!key) continue;
    directCount.set(key, (directCount.get(key) ?? 0) + 1);
  }

  // 章节树最多三层，自底向上累加含后代的题数
  const childrenOf = new Map<string, string[]>();
  for (const c of chapters) {
    const key = c.parentId?.toString() ?? "root";
    const list = childrenOf.get(key);
    if (list) list.push(c.id.toString());
    else childrenOf.set(key, [c.id.toString()]);
  }

  const totalCache = new Map<string, number>();
  const totalFor = (cid: string, seen = new Set<string>()): number => {
    const cached = totalCache.get(cid);
    if (cached !== undefined) return cached;
    seen.add(cid);
    let total = directCount.get(cid) ?? 0;
    for (const childId of childrenOf.get(cid) ?? []) {
      if (seen.has(childId)) continue;
      total += totalFor(childId, seen);
    }
    totalCache.set(cid, total);
    return total;
  };

  const serialize = (parentId: string | null): any[] =>
    chapters
      .filter((c) => (c.parentId?.toString() ?? null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id))
      .map((c) => ({
        id: c.id.toString(),
        gradeId: c.gradeId.toString(),
        parentId: c.parentId?.toString() ?? null,
        name: c.name,
        sortOrder: c.sortOrder,
        questionCount: totalFor(c.id.toString()),
        children: serialize(c.id.toString()),
      }));

  return NextResponse.json(serialize(null));
}
