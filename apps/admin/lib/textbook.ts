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

/**
 * 章节练习的题目过滤条件：直接命中题目自身的 chapterId（含后代章节）。
 * 关键两点：
 * 1. 只看题目自身的 chapterId —— 章节归属与考纲归属是两条独立维度
 * 2. 不经过知识点间接取题 —— 章节归属是题目自身的字段，间接取题会把全站同知识点的题都卷进来
 * 章节 id 集合为空时返回 null，调用方直接当作「无题」处理。
 */
export function chapterQuestionWhere(
  chapterIds: bigint[],
  subjectId?: bigint | null,
): Record<string, unknown> | null {
  if (chapterIds.length === 0) return null;
  const where: Record<string, unknown> = { chapterId: { in: chapterIds } };
  if (subjectId) where.subjectId = subjectId;
  return where;
}
