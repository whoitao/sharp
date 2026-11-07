/**
 * Wiki 公开接口。
 * 类型与 packages/shared 的 WikiPublic*Dto 保持一致；Web 未依赖 @sharp/shared，
 * 因此这里保留一份本地声明，改动时需两边同步。
 */

// 与 BFF 共用同一套配置（ADMIN_API_BASE 优先），生产环境硬编码兜底
const API_BASE = (
  process.env.ADMIN_API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "https://admin.sharp.whoitao.top/"
).replace(/\/+$/, "");

export interface WikiTreeNode {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  sortOrder: number;
  children: WikiTreeNode[];
}

export interface WikiPageDetail {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  summary: string | null;
  content: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

/** 已发布且公开的整棵树；失败时返回空树，由页面展示空态 */
export async function fetchWikiTree(): Promise<WikiTreeNode[]> {
  try {
    const res = await fetch(`${API_BASE}/api/app/wiki/tree`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { tree?: WikiTreeNode[] } };
    return data.data?.tree ?? [];
  } catch {
    return [];
  }
}

/** 单页详情：按 path 精确查询，不存在或未发布返回 null */
export async function fetchWikiPage(path: string): Promise<WikiPageDetail | null> {
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  try {
    const res = await fetch(`${API_BASE}/api/app/wiki/pages/${encoded}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: WikiPageDetail };
    return data.data ?? null;
  } catch {
    return null;
  }
}
