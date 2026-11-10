import { CategoryNav } from "@/components/article-views";
import { fetchArticleDetail, fetchArticles } from "@/lib/api";
import { formatArticleDate } from "@/lib/article-format";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { sanitizeHtml } from "@/lib/sanitize";
import { getSiteSettings, siteNameFor } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 详情页依赖文章 id 且每次访问要计一次浏览量，属于按请求渲染。
 * 该路由的 id 无法在构建期枚举，generateMetadata 读取 params 会被
 * Cache Components 判为运行时数据，因此用 React 19 的 <title>/<meta>
 * 提升到 head（随页面流式输出）。
 */
export default function ArticleDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="py-16" />}>
      <ArticleDetail params={params} />
    </Suspense>
  );
}

async function ArticleDetail({ params }: PageProps) {
  const { id } = await params;
  const [article, articles, settings, locale] = await Promise.all([
    fetchArticleDetail(id),
    fetchArticles(),
    getSiteSettings(),
    getRequestLocale(),
  ]);
  if (!article) notFound();

  const siteName = siteNameFor(settings, locale);
  const canonical = new URL(`/articles/${id}`, settings.siteUrl).toString();

  const categories = Array.from(
    new Set(articles.map((item) => item.categoryName).filter(Boolean)),
  );

  return (
    <div className="py-8 md:py-12">
      <title>{`${article.title} | ${siteName}`}</title>
      {article.summary ? <meta name="description" content={article.summary} /> : null}
      <link rel="canonical" href={canonical} />

      <div className="grid gap-8 lg:grid-cols-[180px_1fr] lg:items-start lg:gap-6">
        <aside className="lg:sticky lg:top-24">
          <CategoryNav categories={categories} activeCategory={article.categoryName} />
        </aside>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs text-foreground-tertiary">
              <span className="rounded bg-primary-light px-2 py-0.5 font-medium text-primary-strong">
                {article.categoryName}
              </span>
              <span>{formatArticleDate(article.publishedAt)}</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {article.title}
            </h1>
            {article.summary ? (
              <p className="text-foreground-secondary">{article.summary}</p>
            ) : null}
          </div>

          <article
            className="article-content rounded-lg border border-border bg-surface p-6 card-shadow md:p-10"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
          />
        </div>
      </div>
    </div>
  );
}
