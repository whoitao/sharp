import { fetchArticles } from "@/lib/api";
import { getSiteSettings } from "@/lib/site-settings";
import type { MetadataRoute } from "next";
import { connection } from "next/server";

/** 公开内容页；登录后才能访问的 /learn、/account 不收录 */
const STATIC_PATHS = ["/", "/wiki", "/articles", "/about"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 站点 URL 与文章列表都依赖运行时配置/接口，按请求生成
  await connection();
  const settings = await getSiteSettings();
  const base = new URL(settings.siteUrl);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: new URL(path, base).toString(),
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const articles = await fetchArticles(100);
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: new URL(`/articles/${article.id}`, base).toString(),
    lastModified: article.publishedAt ? new Date(article.publishedAt) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...articleEntries];
}
