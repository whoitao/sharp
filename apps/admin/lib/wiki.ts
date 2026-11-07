import type { WikiPageStatus, WikiVisibility } from "@sharp/shared";

/** 最多 5 层（root level = 0），POST / PATCH / move 共用 */
export const MAX_WIKI_DEPTH = 5;

export const WIKI_STATUSES: WikiPageStatus[] = ["draft", "published"];
export const WIKI_VISIBILITIES: WikiVisibility[] = ["public", "private"];

/** slug 只允许小写字母、数字与连字符 */
export const WIKI_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 排序步长：新节点/移动后按 10 递增，留出手工插入空间 */
export const WIKI_SORT_STEP = 10;

/** 把用户输入整理成合法 slug（中文等无法转换的字符会被移除，由前端提示手填） */
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 根节点 path = slug；子节点 path = parent.path + "/" + slug */
export function joinWikiPath(parentPath: string | null | undefined, slug: string): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

export interface WikiFlatRow {
  id: bigint;
  parentId: bigint | null;
  path: string;
  level: number;
}

/** parentId → children 索引；根节点 key 为空字符串 */
export function indexWikiChildren<T extends { id: bigint; parentId: bigint | null }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.parentId?.toString() ?? "";
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/** 按 sortOrder、id 升序排列（所有树接口统一排序键） */
export function sortWikiRows<T extends { sortOrder: number; id: bigint }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id),
  );
}

/** 收集某个节点的全部后代（不含自身） */
export function collectWikiSubtree<T extends { id: bigint; parentId: bigint | null }>(
  rows: T[],
  rootId: bigint,
): T[] {
  const children = indexWikiChildren(rows);
  const result: T[] = [];
  const walk = (id: bigint) => {
    for (const child of children.get(id.toString()) ?? []) {
      result.push(child);
      walk(child.id);
    }
  };
  walk(rootId);
  return result;
}

/**
 * 重命名 slug / 移动父节点后，重算节点自身与全部后代的 path / level。
 * rows 必须是同一次查询拿到的全量节点。
 */
export function remapWikiPaths<T extends WikiFlatRow>(
  rows: T[],
  root: WikiFlatRow,
  nextPath: string,
  nextLevel: number,
): { id: bigint; path: string; level: number }[] {
  const descendants = collectWikiSubtree(rows, root.id);
  return descendants.map((node) => ({
    id: node.id,
    // 后代 path 一定以 root.path + "/" 开头，保留相对部分
    path: nextPath + node.path.slice(root.path.length),
    level: node.level + (nextLevel - root.level),
  }));
}

/** 计算子树高度：自身为 0，子节点逐层 +1 */
export function wikiSubtreeHeight<T extends { id: bigint; parentId: bigint | null }>(
  rows: T[],
  rootId: bigint,
): number {
  const children = indexWikiChildren(rows);
  const height = (id: bigint): number => {
    const list = children.get(id.toString()) ?? [];
    if (list.length === 0) return 0;
    return 1 + Math.max(...list.map((child) => height(child.id)));
  };
  return height(rootId);
}
