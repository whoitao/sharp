import { prisma } from "@/lib/prisma";

/**
 * 章节自身 + 所有后代章节 id。
 * 一次取出全表在内存里建立 parentId → children 索引，避免递归查询；
 * 章节表体量很小（每个年级几十个节点），一次全表扫描成本可接受。
 */
export async function getChapterSubtreeIds(chapterId: bigint): Promise<bigint[]> {
  const all = await prisma.chapter.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, bigint[]>();
  for (const c of all) {
    const key = c.parentId?.toString() ?? "root";
    const list = childrenOf.get(key);
    if (list) list.push(c.id);
    else childrenOf.set(key, [c.id]);
  }

  const ids: bigint[] = [chapterId];
  const walk = (id: bigint) => {
    for (const child of childrenOf.get(id.toString()) ?? []) {
      ids.push(child);
      walk(child);
    }
  };
  walk(chapterId);
  return ids;
}

/** 章节（含所有后代章节）关联的知识点 id 集合，去重 */
export async function getChapterKnowledgePointIds(chapterId: bigint): Promise<bigint[]> {
  const chapterIds = await getChapterSubtreeIds(chapterId);
  const links = await prisma.knowledgePointChapter.findMany({
    where: { chapterId: { in: chapterIds } },
    select: { knowledgePointId: true },
  });
  const seen = new Set<string>();
  const ids: bigint[] = [];
  for (const l of links) {
    const key = l.knowledgePointId.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(l.knowledgePointId);
  }
  return ids;
}

/**
 * 章节练习的题目过滤条件。
 * 关键：不按 categoryId 过滤 —— 教材章节跨考纲分类取题，带上分类会漏掉大量题目。
 * 知识点集合为空时返回 null，调用方直接当作「无题」处理。
 */
export function chapterQuestionWhere(
  kpIds: bigint[],
  subjectId?: bigint | null,
): Record<string, unknown> | null {
  if (kpIds.length === 0) return null;
  const where: Record<string, unknown> = {
    knowledgePoints: { some: { knowledgePointId: { in: kpIds } } },
  };
  if (subjectId) where.subjectId = subjectId;
  return where;
}
