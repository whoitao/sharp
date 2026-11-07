"use client";

import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchCatalog,
  flattenTextbooks,
  selectTextbook,
  type CatalogResponse,
  type TextbookDto,
} from "@/lib/learn/api";
import { useStudyScope } from "@/lib/study-scope";
import { cn } from "@/lib/utils";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Status = "loading" | "error" | "ready";

/**
 * 教材选择列表：竖版封面卡片，选中后回调 onOpen。
 * 只作为「我的教材」页内嵌区块使用，当前教材横幅与页面标题由外层展示。
 */
export function TextbookPicker({
  onOpen,
}: {
  onOpen: (textbook: TextbookDto) => void;
}) {
  const { t } = useLocale();
  // 年级 / 科目来自导航栏的全局学习范围，不在列表里单独筛选
  const { gradeId, subjectId, clear: clearScope, syncFromTextbook } = useStudyScope();
  // 还没选年级或科目时只给提示，不把全部教材倒出来
  const scopeMissing = !gradeId || !subjectId;

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchCatalog()
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        setSelectedId(data.selectedTextbookId ?? null);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const allTextbooks = useMemo(
    () => (catalog ? catalog.stages.flatMap((stage) => flattenTextbooks(stage)) : []),
    [catalog],
  );

  const filtered = useMemo(
    () =>
      allTextbooks.filter(
        (textbook) =>
          (!gradeId || textbook.gradeId === gradeId) &&
          (!subjectId || textbook.subjectId === subjectId),
      ),
    [allTextbooks, gradeId, subjectId],
  );

  const totalTextbooks = allTextbooks.length;
  const hasFilters = Boolean(gradeId || subjectId);

  async function handlePick(textbook: TextbookDto) {
    if (savingId) return;
    setSelectError(false);
    if (selectedId !== textbook.id) {
      setSavingId(textbook.id);
      try {
        // 只提交 textbookId，年级/科目/出版社由服务端反推
        await selectTextbook(textbook.id);
        setSelectedId(textbook.id);
        // 服务端已把教材的年级/科目写进设置，同步导航栏的全局范围
        syncFromTextbook({ gradeId: textbook.gradeId, subjectId: textbook.subjectId });
      } catch {
        setSelectError(true);
        setSavingId(null);
        return;
      }
      setSavingId(null);
    }
    onOpen(textbook);
  }

  return (
    <div>
      {selectError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t("learn.selectError")}
        </p>
      )}

      {status === "loading" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[136px] animate-pulse rounded-lg border border-border bg-surface"
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 card-shadow">
          <p className="font-bold">{t("learn.loadErrorTitle")}</p>
          <p className="text-sm text-foreground-secondary">{t("learn.loadErrorBody")}</p>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t("learn.retry")}
          </Button>
        </div>
      )}

      {status === "ready" && totalTextbooks === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center card-shadow">
          <p className="font-bold">{t("learn.emptyCatalogTitle")}</p>
          <p className="mt-1.5 text-sm text-foreground-secondary">
            {t("learn.emptyCatalogBody")}
          </p>
        </div>
      )}

      {status === "ready" && scopeMissing && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center card-shadow">
          <p className="font-bold">{t("learn.scopeRequiredTitle")}</p>
          <p className="mt-1.5 text-sm text-foreground-secondary">
            {t("learn.scopeRequiredBody")}
          </p>
        </div>
      )}

      {status === "ready" && !scopeMissing && totalTextbooks > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">
              {t("learn.allTextbooks")}
              <span className="ml-2 text-xs font-semibold text-foreground-tertiary">
                {t("learn.count", { n: filtered.length })}
              </span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-3 rounded-lg border border-border bg-surface p-8 text-center card-shadow">
              <p className="font-bold">{t("learn.emptyFilterTitle")}</p>
              <p className="mt-1.5 text-sm text-foreground-secondary">
                {t("learn.emptyFilterBody")}
              </p>
              {hasFilters && (
                <Button size="sm" variant="outline" className="mt-4" onClick={clearScope}>
                  {t("learn.clearFilters")}
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((textbook) => {
                const selected = textbook.id === selectedId;
                const saving = savingId === textbook.id;
                return (
                  <button
                    key={textbook.id}
                    type="button"
                    onClick={() => handlePick(textbook)}
                    aria-pressed={selected}
                    aria-busy={saving}
                    className={cn(
                      "relative flex gap-3 rounded-lg border bg-surface p-3 text-left card-shadow transition",
                      selected
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border hover:-translate-y-0.5 hover:border-primary/35",
                      saving && "opacity-70",
                    )}
                  >
                    <div className="w-[78px] shrink-0 sm:w-[84px] xl:w-[88px]">
                      <TextbookCover textbook={textbook} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="line-clamp-2 pr-7 text-sm font-bold leading-snug">
                        {textbook.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-foreground-tertiary">
                        {textbook.publisherName} · {textbook.gradeName} ·{" "}
                        {textbook.semesterLabel}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-light pt-2 text-xs text-foreground-secondary">
                        <span className="truncate">
                          {t("learn.chaptersCount", { n: textbook.chapterCount })}
                        </span>
                        <span className="shrink-0 font-semibold text-primary-strong">
                          {t("learn.questionsCount", { n: textbook.questionCount })}
                        </span>
                      </div>
                    </div>
                    {(selected || saving) && (
                      <span className="absolute right-3 top-3 z-[2] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
