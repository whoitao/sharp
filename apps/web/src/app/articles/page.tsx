import { ArticleList } from "@/components/article-views";
import { fetchArticles } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { buildSiteMetadata, getSiteSettings, siteNameFor } from "@/lib/site-settings";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSiteSettings(), getRequestLocale()]);
  const siteName = siteNameFor(settings, locale);
  return buildSiteMetadata({
    settings,
    locale,
    path: "/articles",
    title: locale === "zh" ? `新闻中心 | ${siteName}` : `News | ${siteName}`,
    description:
      locale === "zh"
        ? `${siteName} 产品动态、学习指南与备考技巧`
        : `${siteName} product updates, learning guides and exam tips`,
  });
}

export default function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // cacheComponents 下 searchParams 属于运行时数据，必须放进 Suspense 边界内读取
  return (
    <Suspense fallback={<div className="py-16" />}>
      <ArticlesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ArticlesContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const articles = await fetchArticles();

  const categories = Array.from(
    new Set(articles.map((article) => article.categoryName).filter(Boolean)),
  );
  const activeCategory = category && categories.includes(category) ? category : null;
  const visible = activeCategory
    ? articles.filter((article) => article.categoryName === activeCategory)
    : articles;

  return (
    <ArticleList
      articles={visible}
      categories={categories}
      activeCategory={activeCategory}
    />
  );
}
