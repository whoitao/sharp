/** 文章前端接口（公开），Web 端服务端渲染时直接请求后台 API */

// 与 apps/mobile/src/services/api.ts 一致：生产环境硬编码兜底，避免构建时环境变量未注入
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.sharp.whoitao.top/"
).replace(/\/+$/, "");

export interface ArticleListItem {
  id: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  viewCount: number;
  categoryId: string;
  categoryName: string;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
}

/** noStore 用于详情页：每次访问都要计入一次浏览量，不能命中缓存 */
async function request<T>(
  path: string,
  options: { noStore?: boolean } = {},
): Promise<T | null> {
  try {
    const res = await fetch(
      `${API_BASE}${path}`,
      options.noStore ? { cache: "no-store" } : { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 已发布且发布到 Web 频道的文章列表 */
export async function fetchArticles(pageSize = 30): Promise<ArticleListItem[]> {
  const data = await request<{ items: ArticleListItem[] }>(
    `/api/app/articles?channel=web&page=1&pageSize=${pageSize}`,
  );
  return data?.items ?? [];
}

/** 文章详情：每次访问都计入一次浏览量，因此不走缓存 */
export async function fetchArticleDetail(id: string): Promise<ArticleDetail | null> {
  return request<ArticleDetail>(`/api/app/articles/${id}?channel=web&view=1`, {
    noStore: true,
  });
}
