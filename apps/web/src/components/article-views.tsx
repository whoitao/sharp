"use client";

import type { ArticleListItem } from "@/lib/api";
import { formatArticleDate } from "@/lib/article-format";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";

export function ArticleList({ articles }: { articles: ArticleListItem[] }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-8 py-8 md:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("articles.title")}</h1>
        <p className="text-foreground-secondary">{t("articles.subtitle")}</p>
      </div>

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
    </div>
  );
}

export function BackToArticlesLink() {
  const { t } = useLocale();

  return (
    <Link href="/articles" className="text-sm text-foreground-secondary hover:text-primary-strong">
      {t("articles.backToList")}
    </Link>
  );
}
