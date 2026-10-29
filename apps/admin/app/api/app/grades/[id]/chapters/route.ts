import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 某个年级下的章节树，附带每个章节（含后代）聚合的题目数。
 * 题目数一次性算完：按知识点关联反查题目的知识点集合，再在内存里对每个章节求交集计数，
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

  const chapterIds = chapters.map((c) => c.id);

  // 章节 → 直属知识点
  const links = await prisma.knowledgePointChapter.findMany({
    where: { chapterId: { in: chapterIds } },
    select: { chapterId: true, knowledgePointId: true },
  });
  const directKps = new Map<string, string[]>();
  for (const l of links) {
    const key = l.chapterId.toString();
    const list = directKps.get(key);
    if (list) list.push(l.knowledgePointId.toString());
    else directKps.set(key, [l.knowledgePointId.toString()]);
  }

  // 自底向上聚合每个节点的知识点集合（章节树最多三层，递归安全）
  const childrenOf = new Map<string, string[]>();
  for (const c of chapters) {
    const key = c.parentId?.toString() ?? "root";
    const list = childrenOf.get(key);
    if (list) list.push(c.id.toString());
    else childrenOf.set(key, [c.id.toString()]);
  }

  const subtreeKpCache = new Map<string, Set<string>>();
  const collectKps = (cid: string, seen = new Set<string>()): Set<string> => {
    const cached = subtreeKpCache.get(cid);
    if (cached) return cached;
    seen.add(cid);
    const set = new Set<string>(directKps.get(cid) ?? []);
    for (const childId of childrenOf.get(cid) ?? []) {
      if (seen.has(childId)) continue;
      for (const kp of collectKps(childId, seen)) set.add(kp);
    }
    subtreeKpCache.set(cid, set);
    return set;
  };

  // 全年级涉及的知识点并集 → 一次查出这些题目各自的知识点集合
  const allKps = new Set<string>();
  for (const c of chapters) for (const kp of collectKps(c.id.toString())) allKps.add(kp);

  let questionKpSets: string[][] = [];
  if (allKps.size > 0) {
    const questionWhere: Record<string, unknown> = {
      knowledgePoints: { some: { knowledgePointId: { in: [...allKps].map((s) => BigInt(s)) } } },
    };
    if (subjectIdRaw) questionWhere.subjectId = BigInt(subjectIdRaw);
    const questions = await prisma.question.findMany({
      where: questionWhere,
      select: { id: true, knowledgePoints: { select: { knowledgePointId: true } } },
    });
    questionKpSets = questions.map((q) => q.knowledgePoints.map((kp) => kp.knowledgePointId.toString()));
  }

  const countForChapter = (cid: string): number => {
    const kpSet = collectKps(cid);
    if (kpSet.size === 0) return 0;
    let count = 0;
    for (const qKps of questionKpSets) {
      if (qKps.some((kp) => kpSet.has(kp))) count += 1;
    }
    return count;
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
        questionCount: countForChapter(c.id.toString()),
        children: serialize(c.id.toString()),
      }));

  return NextResponse.json(serialize(null));
}
