"use client";

import { RichText } from "@/components/learn/rich-text";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchFavorites,
  removeFavorite,
  type FavoriteItemDto,
} from "@/lib/learn/api";
import { useStudyScope } from "@/lib/study-scope";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadStatus = "loading" | "ready" | "error";

const PAGE_SIZE = 20;

/**
 * 我的收藏：默认跟随导航栏的全局年级/科目，可临时切到「全部收藏」；
 * 展开查看题干、选项与解析，可直接取消收藏（乐观移除，失败还原）。
 */
export function FavoritesPanel() {
  const { t, locale } = useLocale();
  const { ready: scopeReady, gradeId, subjectId } = useStudyScope();

  // 只有选了年级或科目时，「当前范围 / 全部收藏」的切换才有意义
  const scopeActive = Boolean(gradeId || subjectId);
  const [followScope, setFollowScope] = useState(true);
  const filtered = followScope && scopeActive;

  const [items, setItems] = useState<FavoriteItemDto[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});
  const [removeError, setRemoveError] = useState(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!scopeReady) return;
      if (append) setLoadingMore(true);
      else setStatus("loading");
      try {
        const data = await fetchFavorites({
          page: targetPage,
          pageSize: PAGE_SIZE,
          gradeId: filtered ? gradeId : null,
          subjectId: filtered ? subjectId : null,
        });
        setItems((prev) => (append ? [...prev, ...data.data] : data.data));
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setStatus("ready");
      } catch {
        if (!append) {
          setItems([]);
          setStatus("error");
        }
      } finally {
        setLoadingMore(false);
      }
    },
    [scopeReady, filtered, gradeId, subjectId],
  );

  useEffect(() => {
    if (!scopeReady) return;
    setExpandedIds({});
    void load(1, false);
  }, [scopeReady, load]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [locale],
  );

  const toggle = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  async function handleRemove(item: FavoriteItemDto) {
    if (removingIds[item.questionId]) return;
    const snapshot = items;
    setRemovingIds((prev) => ({ ...prev, [item.questionId]: true }));
    setItems((prev) => prev.filter((row) => row.questionId !== item.questionId));
    setTotal((n) => Math.max(0, n - 1));
    try {
      await removeFavorite(item.questionId);
    } catch {
      setItems(snapshot);
      setTotal((n) => n + 1);
      setRemoveError(true);
      window.setTimeout(() => setRemoveError(false), 2400);
    } finally {
      setRemovingIds((prev) => {
        const rest = { ...prev };
        delete rest[item.questionId];
        return rest;
      });
    }
  }

  const emptyFiltered = filtered;

  return (
    <div className="min-w-0 pb-2 md:grid md:content-start md:pb-0">
      <div className="md:contents">
        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("favorites.loading")}
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-6 text-center card-shadow md:h-full">
            <p className="text-sm font-semibold">{t("favorites.loadErrorTitle")}</p>
            <p className="mt-1 text-xs text-foreground-secondary">
              {t("favorites.loadErrorBody")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void load(1, false)}
            >
              {t("favorites.retryLoad")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow md:h-full">
            <Star className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 text-sm font-semibold">
              {emptyFiltered
                ? t("favorites.emptyFilteredTitle")
                : t("favorites.emptyTitle")}
            </p>
            <p className="mt-1 text-xs text-foreground-secondary">
              {emptyFiltered
                ? t("favorites.emptyFilteredBody")
                : t("favorites.emptyBody")}
            </p>
            {emptyFiltered && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFollowScope(false)}
              >
                {t("favorites.scopeAll")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">
                {t("favorites.title")}
                <span className="ml-2 text-xs font-semibold text-foreground-tertiary">
                  {t("favorites.count", { n: total })}
                </span>
              </h2>
              {scopeActive && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={filtered ? "outline" : "ghost"}
                    size="sm"
                    className={cn("rounded-full", filtered && "border-primary/40 text-primary-strong")}
                    aria-pressed={filtered}
                    onClick={() => setFollowScope(true)}
                  >
                    {t("favorites.scopeCurrent")}
                  </Button>
                  <Button
                    variant={!filtered ? "outline" : "ghost"}
                    size="sm"
                    className={cn("rounded-full", !filtered && "border-primary/40 text-primary-strong")}
                    aria-pressed={!filtered}
                    onClick={() => setFollowScope(false)}
                  >
                    {t("favorites.scopeAll")}
                  </Button>
                </div>
              )}
            </div>

            {removeError && (
              <p className="mt-2 text-right text-xs text-destructive">
                {t("favorites.removeFailed")}
              </p>
            )}

            <ul className="mt-3 space-y-2.5">
              {items.map((item, index) => {
                const expanded = !!expandedIds[item.questionId];
                const question = item.question;
                const options = [...question.options].sort((a, b) => a.sortNo - b.sortNo);
                const multiple = question.type === 2;
                return (
                  <li
                    key={item.questionId}
                    className="overflow-hidden rounded-lg border border-border bg-surface card-shadow"
                  >
                    <div className="flex items-start gap-1 p-3.5">
                      <button
                        type="button"
                        onClick={() => toggle(item.questionId)}
                        aria-expanded={expanded}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left transition-colors hover:bg-surface-secondary/60"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold tabular-nums text-primary-strong">
                          {index + 1}
                        </span>
                        <RichText
                          html={question.content}
                          className={cn(
                            "wrong-stem prose-compact min-w-0 flex-1",
                            !expanded &&
                              "line-clamp-1 [&_figure]:hidden [&_img]:hidden [&_table]:hidden",
                          )}
                        />
                        {expanded ? (
                          <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-foreground-tertiary" />
                        ) : (
                          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-foreground-tertiary" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={t("favorites.remove")}
                        title={t("favorites.remove")}
                        disabled={!!removingIds[item.questionId]}
                        onClick={() => void handleRemove(item)}
                        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-strong transition-colors hover:bg-primary/20 disabled:opacity-60"
                      >
                        {removingIds[item.questionId] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4 fill-current" />
                        )}
                      </button>
                    </div>

                    {expanded && (
                      <div className="border-t border-border-light px-3.5 pb-3.5 pt-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-tertiary">
                          <span>
                            {t("favorites.favoritedAt", {
                              date: dateFormatter.format(new Date(item.createdAt)),
                            })}
                          </span>
                          {question.chapter && (
                            <span className="truncate">
                              {question.chapter.textbookName ?? ""}
                              {question.chapter.textbookName ? " · " : ""}
                              {question.chapter.name}
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                          {options.map((option) => (
                            <div
                              key={option.id}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg border px-2.5 py-2",
                                option.isCorrect
                                  ? "border-primary bg-primary-light"
                                  : "border-border-light bg-surface-secondary/60",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[0.625rem] font-bold",
                                  option.isCorrect
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-surface-secondary text-foreground-tertiary",
                                )}
                              >
                                {option.optionKey}
                              </span>
                              <RichText
                                html={option.content}
                                className={cn(
                                  "prose-compact min-w-0 flex-1",
                                  option.isCorrect && "font-medium",
                                )}
                              />
                              {option.isCorrect && (
                                <Check className="h-4 w-4 shrink-0 text-primary-strong" />
                              )}
                            </div>
                          ))}
                        </div>

                        {item.note && (
                          <div className="mt-2.5 rounded-md border border-border-light bg-surface-secondary/60 px-3 py-2.5">
                            <p className="text-xs font-bold text-foreground-secondary">
                              {t("favorites.note")}
                            </p>
                            <p className="mt-1 text-sm text-foreground">{item.note}</p>
                          </div>
                        )}

                        {question.analysis && (
                          <div className="mt-2.5 rounded-md border-l-[3px] border-primary bg-primary-light px-3 py-2.5">
                            <p className="text-xs font-bold text-primary-strong">
                              {t("favorites.analysis")}
                            </p>
                            <RichText
                              html={question.analysis}
                              className="analysis-body mt-1"
                            />
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-end text-xs text-foreground-tertiary">
                          <span className="shrink-0">
                            {question.type === 3
                              ? t("favorites.judgement")
                              : multiple
                                ? t("favorites.multipleChoice")
                                : t("favorites.singleChoice")}
                          </span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {page < totalPages && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void load(page + 1, true)}
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("favorites.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
