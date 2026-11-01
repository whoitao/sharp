import { ArticleList } from "@/components/article-views";
import { fetchArticles } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "文章 | Sharp",
  description: "Sharp 产品动态、学习指南与备考技巧",
};

export default async function ArticlesPage() {
  const articles = await fetchArticles();
  return <ArticleList articles={articles} />;
}
