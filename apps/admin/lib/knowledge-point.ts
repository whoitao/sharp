import { prisma } from "@/lib/prisma";

/**
 * 知识点自身 + 所有后代知识点 id。
 * 一次取出全表在内存里建立 parentId → children 索引，避免递归查询；
 * 知识点表体量很小（每科几百个节点），一次全表扫描成本可接受。
 * 用于「选中父级知识点时命中整个子树的题目」。
 */
export async function getKnowledgePointSubtreeIds(kpId: bigint): Promise<bigint[]> {
  const all = await prisma.knowledgePoint.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, bigint[]>();
  for (const kp of all) {
    const key = kp.parentId?.toString() ?? "root";
    const list = childrenOf.get(key);
    if (list) list.push(kp.id);
    else childrenOf.set(key, [kp.id]);
  }

  const ids: bigint[] = [kpId];
  const walk = (id: bigint) => {
    for (const child of childrenOf.get(id.toString()) ?? []) {
      ids.push(child);
      walk(child);
    }
  };
  walk(kpId);
  return ids;
}
