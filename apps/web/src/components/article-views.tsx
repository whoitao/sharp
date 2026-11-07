"use client";

import type { ArticleListItem } from "@/lib/api";
import { formatArticleDate } from "@/lib/article-format";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";

/** 分类导航：列表页与详情页共用（不放「分类」标题，只保留筛选项） */
export function CategoryNav({
  categories,
  activeCategory,
}: {
  categories: string[];
  activeCategory: string | null;
}) {
  const { t } = useLocale();

  const itemClass = (active: boolean) =>
    `text-sm transition-colors ${
      active
        ? "font-semibold text-primary-strong"
        : "text-foreground-secondary hover:text-primary-strong"
    }`;

  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-2 lg:flex-col lg:gap-2">
      <Link href="/articles" className={itemClass(activeCategory === null)}>
        {t("articles.all")}
      </Link>
      {categories.map((name) => (
        <Link
          key={name}
          href={`/articles?category=${encodeURIComponent(name)}`}
          className={itemClass(activeCategory === name)}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}

export function ArticleList({
  articles,
  categories,
  activeCategory,
}: {
  articles: ArticleListItem[];
  categories: string[];
  activeCategory: string | null;
}) {
  const { t } = useLocale();

  return (
    <div className="py-8 md:py-12 lg:py-18">
      <header className="mx-auto flex max-w-[58rem] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
          {t("articles.title")}
        </h1>
        <p className="text-lg text-foreground-secondary">{t("articles.subtitle")}</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[180px_1fr] lg:items-start lg:gap-12">
        <aside className="lg:sticky lg:top-24">
          <CategoryNav categories={categories} activeCategory={activeCategory} />
        </aside>

        <section>
          {articles.length === 0 ? (
            <p className="py-16 text-center text-foreground-secondary">{t("articles.empty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="group relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 card-shadow transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 text-xs text-foreground-tertiary">
                    <span className="rounded bg-primary-light px-2 py-0.5 font-medium text-primary-strong">
                      {article.categoryName}
                    </span>
                    <span>{formatArticleDate(article.publishedAt)}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug group-hover:text-primary-strong">
                    {article.title}
                  </h2>
                  {article.summary ? (
                    <p className="line-clamp-2 text-sm leading-6 text-foreground-secondary">
                      {article.summary}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
