"use client";

import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchChapterTree,
  fetchRecords,
  fetchUnits,
  firstChapterWithQuestions,
  quizHref,
  type ChapterNodeDto,
  type StudyRecordDto,
  type TextbookDto,
  type UnitsResponse,
} from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Status = "loading" | "error" | "ready";

function TreeItems({
  nodes,
  activeId,
  depth,
  questionsLabel,
  onSelect,
}: {
  nodes: ChapterNodeDto[];
  activeId: string | null;
  depth: number;
  questionsLabel: (count: number) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-[7px] py-2 pr-2 text-left transition-colors",
              node.id === activeId
                ? "bg-primary-light text-foreground"
                : "text-foreground-secondary hover:bg-surface-secondary",
            )}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <span
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full border-[1.5px]",
                node.id === activeId
                  ? "border-primary bg-primary"
                  : "border-border bg-surface",
              )}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-xs font-bold leading-snug",
                  node.id === activeId && "text-primary-strong",
                )}
              >
                {node.name}
              </span>
              <span className="mt-0.5 block text-[10px] text-foreground-tertiary">
                {questionsLabel(node.questionCount)}
              </span>
            </span>
          </button>
          {node.children.length > 0 && (
            <TreeItems
              nodes={node.children}
              activeId={activeId}
              depth={depth + 1}
              questionsLabel={questionsLabel}
              onSelect={onSelect}
            />
          )}
        </div>
      ))}
    </>
  );
}

/** 二级视图：章节树 + 单元列表（单元即答题入口） */
export function ChapterBrowser({
  textbook,
  onBack,
  backLabel,
}: {
  textbook: TextbookDto;
  onBack: () => void;
  /** 返回入口文案：默认「教材目录」，从学习首页进入时传「学习」 */
  backLabel?: string;
}) {
  const { t, locale } = useLocale();

  const [tree, setTree] = useState<ChapterNodeDto[] | null>(null);
  const [treeStatus, setTreeStatus] = useState<Status>("loading");
  const [treeReload, setTreeReload] = useState(0);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [units, setUnits] = useState<UnitsResponse | null>(null);
  const [unitsStatus, setUnitsStatus] = useState<Status>("loading");
  const [unitsReload, setUnitsReload] = useState(0);
  const [records, setRecords] = useState<StudyRecordDto[]>([]);

  useEffect(() => {
    let alive = true;
    setTreeStatus("loading");
    setUnits(null);
    fetchChapterTree(textbook.id)
      .then((data) => {
        if (!alive) return;
        setTree(data);
        // 默认选中第一个有题目的章节，没有则退回第一个章节以便提示「暂无题目」
        setActiveChapterId(firstChapterWithQuestions(data)?.id ?? data[0]?.id ?? null);
        setTreeStatus("ready");
      })
      .catch(() => {
        if (alive) setTreeStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [textbook.id, treeReload]);

  useEffect(() => {
    if (!activeChapterId) return;
    let alive = true;
    setUnitsStatus("loading");
    setUnits(null);
    setRecords([]);
    Promise.all([fetchUnits(activeChapterId), fetchRecords(activeChapterId)])
      .then(([unitsData, recordsData]) => {
        if (!alive) return;
        setUnits(unitsData);
        setRecords(recordsData.data ?? []);
        setUnitsStatus("ready");
      })
      .catch(() => {
        if (alive) setUnitsStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [activeChapterId, unitsReload]);

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

  const activeChapter = useMemo(() => {
    if (!tree || !activeChapterId) return null;
    const walk = (nodes: ChapterNodeDto[]): ChapterNodeDto | null => {
      for (const node of nodes) {
        if (node.id === activeChapterId) return node;
        const found = walk(node.children);
        if (found) return found;
      }
      return null;
    };
    return walk(tree);
  }, [tree, activeChapterId]);

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-tertiary">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-semibold text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel ?? t("learn.backToCatalog")}
        </button>
        <ChevronRight className="h-3 w-3" />
        <b className="max-w-[220px] truncate font-semibold text-foreground-secondary">
          {textbook.name}
        </b>
        {activeChapter && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="max-w-[220px] truncate">{activeChapter.name}</span>
          </>
        )}
      </nav>

      <div className="mt-4 flex items-center gap-4 rounded-lg border border-border bg-surface p-4 card-shadow">
        <TextbookCover textbook={textbook} size="sm" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">{textbook.name}</h1>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {textbook.publisherName} · {textbook.gradeName} · {textbook.semesterLabel} ·{" "}
            {t("learn.chaptersCount", { n: textbook.chapterCount })} ·{" "}
            {t("learn.questionsCount", { n: textbook.questionCount })}
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[336px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-surface p-4 card-shadow lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">{t("learn.treeTitle")}</h2>
            <span className="text-[11px] font-semibold text-foreground-tertiary">
              {t("learn.chaptersCount", { n: textbook.chapterCount })}
            </span>
          </div>

          <div className="mt-2 max-h-[46vh] overflow-y-auto pr-1 lg:max-h-[calc(100vh-11rem)]">
            {treeStatus === "loading" && (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-[7px] bg-surface-secondary"
                  />
                ))}
              </div>
            )}

            {treeStatus === "error" && (
              <div className="py-4 text-center">
                <p className="text-xs text-foreground-secondary">
                  {t("learn.loadErrorTitle")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setTreeReload((k) => k + 1)}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t("learn.retry")}
                </Button>
              </div>
            )}

            {treeStatus === "ready" && (tree?.length ?? 0) === 0 && (
              <p className="py-4 text-xs text-foreground-tertiary">{t("learn.treeEmpty")}</p>
            )}

            {treeStatus === "ready" && (tree?.length ?? 0) > 0 && (
              <TreeItems
                nodes={tree ?? []}
                activeId={activeChapterId}
                depth={0}
                questionsLabel={(count) => t("learn.questionsCount", { n: count })}
                onSelect={setActiveChapterId}
              />
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-lg border border-border bg-surface card-shadow">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">
                {activeChapter?.name ?? t("learn.unitsTitle")}
              </h2>
              <p className="mt-1 text-xs text-foreground-secondary">
                {units
                  ? t("learn.unitsMeta", {
                      units: units.totalUnits,
                      questions: units.totalQuestions,
                    })
                  : t("learn.loading")}
              </p>
            </div>
          </div>

          <div className="border-t border-border-light">
            {unitsStatus === "loading" && (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-[7px] bg-surface-secondary"
                  />
                ))}
              </div>
            )}

            {unitsStatus === "error" && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-foreground-secondary">
                  {t("learn.loadErrorTitle")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setUnitsReload((k) => k + 1)}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t("learn.retry")}
                </Button>
              </div>
            )}

            {unitsStatus === "ready" && (units?.units.length ?? 0) === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="font-bold">{t("learn.unitsEmptyTitle")}</p>
                <p className="mt-1.5 text-sm text-foreground-secondary">
                  {t("learn.unitsEmptyBody")}
                </p>
              </div>
            )}

            {unitsStatus === "ready" &&
              (units?.units.length ?? 0) > 0 &&
              units!.units.map((unit) => {
                const percent =
                  unit.totalQuestions > 0
                    ? Math.round((unit.answeredCount / unit.totalQuestions) * 100)
                    : 0;
                const last = lastByUnit.get(unit.unitIndex);
                return (
                  <div
                    key={unit.unitIndex}
                    className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-light px-4 py-3.5 transition-colors last:border-b-0 hover:bg-surface-secondary lg:grid-cols-[38px_minmax(0,1fr)_120px_auto] lg:px-5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-secondary text-[11px] font-extrabold text-foreground-tertiary">
                      {unit.unitIndex + 1}
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-[13px] font-bold">
                        {t("learn.unitName", { n: unit.unitIndex + 1 })}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
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
                      <div className="mb-1 flex items-center justify-between text-[10px] text-foreground-tertiary">
                        <span>
                          {t("learn.unitStats", {
                            answered: unit.answeredCount,
                            total: unit.totalQuestions,
                          })}
                        </span>
                        <span>{percent}%</span>
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
                          <Link href={quizHref(activeChapterId!, unit.unitIndex)}>
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
      </div>
    </div>
  );
}
