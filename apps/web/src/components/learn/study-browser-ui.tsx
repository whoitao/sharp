"use client";

import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import type { StudyRecordDto, TextbookDto, UnitDto, UnitsResponse } from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronRight, RefreshCw, Repeat } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type Status = "loading" | "error" | "ready";

/**
 * 「按章节学 / 按知识点学」共用的列表 UI：
 * 面包屑、当前教材头卡、左侧树面板、树行、右侧单元列表。
 * 两个页面只负责数据，不再各写一套样式。
 */

/** 面包屑：返回入口 + 若干层级，超长层级单行省略 */
export function StudyBreadcrumb({
  onBack,
  backLabel,
  items,
}: {
  onBack: () => void;
  backLabel: string;
  items: string[];
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-tertiary">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 font-semibold text-foreground-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </button>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span
            className={cn(
              "max-w-[13.75rem] truncate",
              index === 0 && "font-semibold text-foreground-secondary",
            )}
            title={item}
          >
            {item}
          </span>
        </span>
      ))}
    </nav>
  );
}

/** 当前教材头卡：章节学与知识点学共用同一套展示 */
export function StudyHeaderCard({ textbook }: { textbook: TextbookDto }) {
  const { t } = useLocale();

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 card-shadow sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TextbookCover textbook={textbook} size="sm" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">{textbook.name}</h1>
          <p className="mt-0.5 truncate text-xs text-foreground-secondary">
            {textbook.publisherName} · {textbook.gradeName} · {textbook.semesterLabel} ·{" "}
            {t("learn.chaptersCount", { n: textbook.chapterCount })} ·{" "}
            {t("learn.questionsCount", { n: textbook.questionCount })}
          </p>
        </div>
      </div>
      <Button variant="outline" asChild className="w-full shrink-0 justify-center sm:w-auto">
        <Link href="/account/textbook">
          <Repeat className="mr-1.5 h-4 w-4" />
          {t("learn.switchTextbook")}
        </Link>
      </Button>
    </div>
  );
}

/** 左侧树面板：统一容器、滚动区、骨架、错误与空态 */
export function StudyTreePanel({
  status,
  empty,
  emptyText,
  onRetry,
  children,
}: {
  status: Status;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <aside className="overflow-hidden rounded-lg border border-border bg-surface card-shadow lg:sticky lg:top-20">
      <div className="max-h-[46vh] overflow-y-auto lg:max-h-[calc(100vh-10rem)]">
        {status === "loading" && (
          <div className="space-y-1.5 p-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-surface-secondary" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="px-3 py-10 text-center">
            <p className="text-xs text-foreground-secondary">{t("learn.loadErrorTitle")}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("learn.retry")}
            </Button>
          </div>
        )}

        {status === "ready" && empty && (
          <p className="px-3 py-10 text-center text-xs text-foreground-tertiary">{emptyText}</p>
        )}

        {status === "ready" && !empty && (
          <ul className="divide-y divide-border-light">{children}</ul>
        )}
      </div>
    </aside>
  );
}

/** 树行：无前置图标，标题占满剩余宽度，题目数右对齐 */
export function StudyTreeRow({
  label,
  countLabel,
  selected,
  disabled = false,
  depth,
  onSelect,
}: {
  label: string;
  countLabel: string;
  selected: boolean;
  disabled?: boolean;
  depth: number;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-current={selected ? "true" : undefined}
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
        className={cn(
          "flex w-full items-center gap-3 py-2.5 pr-3 text-left transition-colors",
          selected ? "bg-primary-light" : "hover:bg-surface-secondary",
          disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            depth === 0 ? "text-[0.8125rem] font-semibold" : "text-[0.75rem]",
            selected ? "text-primary-strong" : "text-foreground",
            disabled && "text-foreground-tertiary",
          )}
          title={label}
        >
          {label}
        </span>
        <span className="shrink-0 text-[0.6875rem] text-foreground-tertiary">
          {countLabel}
        </span>
      </button>
    </li>
  );
}

/** 两个页面共用的「最近学习时间」格式化与单元索引 */
export function useStudyUnitMeta(records: StudyRecordDto[]) {
  const { locale } = useLocale();

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  // 记录已按 finishedAt 倒序，取每个单元最近一条
  const lastByUnit = useMemo(() => {
    const map = new Map<number, StudyRecordDto>();
    for (const record of records) {
      if (!map.has(record.unitIndex)) map.set(record.unitIndex, record);
    }
    return map;
  }, [records]);

  return { timeFormatter, lastByUnit };
}

/** 右侧单元列表：头部、骨架、错误、空态、单元行与进度条完全共用 */
export function StudyUnitPanel({
  title,
  meta,
  status,
  units,
  lastByUnit,
  timeFormatter,
  hrefFor,
  emptyTitle,
  emptyBody,
  onRetry,
}: {
  title: string;
  meta: string;
  status: Status;
  units: UnitsResponse | null;
  lastByUnit: Map<number, StudyRecordDto>;
  timeFormatter: Intl.DateTimeFormat;
  hrefFor: (unit: UnitDto) => string;
  emptyTitle: string;
  emptyBody: string;
  onRetry: () => void;
}) {
  const { t } = useLocale();
  const list = units?.units ?? [];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface card-shadow">
      <div className="px-5 py-4">
        <h2 className="truncate text-base font-bold" title={title}>
          {title}
        </h2>
        <p className="mt-1 truncate text-xs text-foreground-secondary">{meta}</p>
      </div>

      <div className="border-t border-border-light">
        {status === "loading" && (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-surface-secondary" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-foreground-secondary">{t("learn.loadErrorTitle")}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("learn.retry")}
            </Button>
          </div>
        )}

        {status === "ready" && list.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="font-bold">{emptyTitle}</p>
            <p className="mt-1.5 text-sm text-foreground-secondary">{emptyBody}</p>
          </div>
        )}

        {status === "ready" &&
          list.map((unit) => {
            const percent =
              unit.totalQuestions > 0
                ? Math.round((unit.answeredCount / unit.totalQuestions) * 100)
                : 0;
            const last = lastByUnit.get(unit.unitIndex);
            return (
              <div
                key={unit.unitIndex}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-light px-4 py-3.5 transition-colors last:border-b-0 hover:bg-surface-secondary lg:grid-cols-[2rem_minmax(0,1fr)_7.5rem_auto] lg:px-5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-secondary text-[0.6875rem] font-extrabold text-foreground-tertiary">
                  {unit.unitIndex + 1}
                </span>

                <div className="min-w-0">
                  <h3 className="truncate text-[0.8125rem] font-bold">
                    {t("learn.unitName", { n: unit.unitIndex + 1 })}
                  </h3>
                  <p className="mt-0.5 truncate text-[0.6875rem] text-foreground-tertiary">
                    {t("learn.unitRange", {
                      start: unit.startIndex + 1,
                      end: unit.endIndex + 1,
                    })}
                    {" · "}
                    {last?.finishedAt
                      ? t("learn.lastStudied", {
                          time: timeFormatter.format(new Date(last.finishedAt)),
                        })
                      : t("learn.notStarted")}
                    <span className="lg:hidden">
                      {" · "}
                      {t("learn.unitStats", {
                        answered: unit.answeredCount,
                        total: unit.totalQuestions,
                      })}
                    </span>
                  </p>
                </div>

                <div className="hidden lg:block">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[0.625rem] text-foreground-tertiary">
                    <span className="truncate">
                      {t("learn.unitStats", {
                        answered: unit.answeredCount,
                        total: unit.totalQuestions,
                      })}
                    </span>
                    <span className="shrink-0">{percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border-light">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="justify-self-end">
                  {unit.totalQuestions === 0 ? (
                    <Button size="sm" variant="outline" disabled>
                      {t("learn.noQuestions")}
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <Link href={hrefFor(unit)}>
                        {unit.status === "not_started"
                          ? t("learn.start")
                          : t("learn.continue")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
