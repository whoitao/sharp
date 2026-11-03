import { ArticleList } from "@/components/article-views";
import { fetchArticles } from "@/lib/api";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "新闻中心 | Sharp",
  description: "Sharp 产品动态、学习指南与备考技巧",
};

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
