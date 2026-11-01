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

/**
 * 年级 / 教材版本 的公共过滤口径（知识点树、单元列表、开始学习、知识点取题四处共用）。
 * - 年级：历史数据没有年级（null）视为不限年级
 * - 教材版本：只约束教材同步题（按章节归属匹配）；无章节的题目（真题/模拟/词汇）不受版本限制，
 *   否则 CET-4 词汇、中考真题这类 chapterId 为空的题会被版本过滤全部误伤
 * 两者都是 OR 语义，必须放进 AND 数组，避免第二个条件覆盖第一个。
 */
export function applyScopeFilter(
  where: Record<string, unknown>,
  scope: { gradeId?: bigint | null; publisherId?: bigint | null },
): Record<string, unknown> {
  const { gradeId, publisherId } = scope;
  const scopeConditions: Record<string, unknown>[] = [];
  if (gradeId) {
    scopeConditions.push({ OR: [{ gradeId }, { gradeId: null }] });
  }
  if (publisherId) {
    scopeConditions.push({
      OR: [{ chapter: { publisherId } }, { chapterId: null }],
    });
  }
  if (scopeConditions.length > 0) {
    const existing = where.AND as Record<string, unknown>[] | undefined;
    where.AND = existing ? [...existing, ...scopeConditions] : scopeConditions;
  }
  return where;
}
