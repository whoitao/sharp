"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchKnowledgePoints,
  fetchKnowledgeRecords,
  fetchKnowledgeUnits,
  firstKnowledgePointWithQuestions,
  knowledgeQuizHref,
  type KnowledgePointDto,
  type StudyRecordDto,
  type TextbookDto,
  type UnitsResponse,
} from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Status = "loading" | "error" | "ready";

function KnowledgeTree({
  nodes,
  activeId,
  depth,
  questionsLabel,
  noQuestionsLabel,
  onSelect,
}: {
  nodes: KnowledgePointDto[];
  activeId: string | null;
  depth: number;
  questionsLabel: (count: number) => string;
  noQuestionsLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const enabled = node.questionCount > 0;
        return (
          <div key={node.id}>
            <button
              type="button"
              onClick={() => onSelect(node.id)}
              disabled={!enabled}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-[7px] py-2 pr-2 text-left transition-colors",
                node.id === activeId
                  ? "bg-primary-light text-foreground"
                  : "text-foreground-secondary hover:bg-surface-secondary",
                !enabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
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
                <span className="mt-0.5 block text-[0.625rem] text-foreground-tertiary">
                  {enabled ? questionsLabel(node.questionCount) : noQuestionsLabel}
                </span>
              </span>
            </button>
            {node.children.length > 0 && (
              <KnowledgeTree
                nodes={node.children}
                activeId={activeId}
                depth={depth + 1}
                questionsLabel={questionsLabel}
                noQuestionsLabel={noQuestionsLabel}
                onSelect={onSelect}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * 「按知识点学」：知识点树 + 单元列表。
 * 学习范围（科目/学段/年级/版本）取自当前已选教材，与移动端进入
 * KnowledgeUnits 时传入的参数口径一致。
 */
export function KnowledgeBrowser({
  textbook,
  onBack,
}: {
  textbook: TextbookDto;
  onBack: () => void;
}) {
  const { t, locale } = useLocale();

  const [tree, setTree] = useState<KnowledgePointDto[] | null>(null);
  const [treeStatus, setTreeStatus] = useState<Status>("loading");
  const [treeReload, setTreeReload] = useState(0);
  const [activeKpId, setActiveKpId] = useState<string | null>(null);

  const [units, setUnits] = useState<UnitsResponse | null>(null);
  const [unitsStatus, setUnitsStatus] = useState<Status>("loading");
  const [unitsReload, setUnitsReload] = useState(0);
  const [records, setRecords] = useState<StudyRecordDto[]>([]);

  useEffect(() => {
    let alive = true;
    setTreeStatus("loading");
    setUnits(null);
    fetchKnowledgePoints({
      subjectId: textbook.subjectId,
      stageId: textbook.stageId,
      gradeId: textbook.gradeId,
      publisherId: textbook.publisherId,
    })
      .then((data) => {
        if (!alive) return;
        setTree(data);
        // 默认选中第一个有题目的知识点，没有则退回第一个以便提示「暂无题目」
        setActiveKpId(firstKnowledgePointWithQuestions(data)?.id ?? data[0]?.id ?? null);
        setTreeStatus("ready");
      })
      .catch(() => {
        if (alive) setTreeStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [textbook.id, textbook.subjectId, textbook.stageId, textbook.gradeId, textbook.publisherId, treeReload]);

  useEffect(() => {
    if (!activeKpId) return;
    let alive = true;
    setUnitsStatus("loading");
    setUnits(null);
    setRecords([]);
    Promise.all([
      fetchKnowledgeUnits({
        subjectId: textbook.subjectId,
        gradeId: textbook.gradeId,
        publisherId: textbook.publisherId,
        knowledgePointId: activeKpId,
      }),
      // 学习记录只用于「上次学习」，失败不影响单元列表
      fetchKnowledgeRecords(activeKpId).catch(() => ({ data: [], total: 0 })),
    ])
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
  }, [textbook.subjectId, textbook.gradeId, textbook.publisherId, activeKpId, unitsReload]);

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

  const totalCount = useMemo(() => {
    let count = 0;
    const walk = (nodes: KnowledgePointDto[]) => {
      for (const node of nodes) {
        count += 1;
        walk(node.children);
      }
    };
    if (tree) walk(tree);
    return count;
  }, [tree]);

  const activeKp = useMemo(() => {
    if (!tree || !activeKpId) return null;
    const walk = (nodes: KnowledgePointDto[]): KnowledgePointDto | null => {
      for (const node of nodes) {
        if (node.id === activeKpId) return node;
        const found = walk(node.children);
        if (found) return found;
      }
      return null;
    };
    return walk(tree);
  }, [tree, activeKpId]);

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground-tertiary">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-semibold text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("learn.backToStudy")}
        </button>
        <ChevronRight className="h-3 w-3" />
        <b className="max-w-[220px] truncate font-semibold text-foreground-secondary">
          {textbook.name}
        </b>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate">{t("learn.studyByKnowledge")}</span>
        {activeKp && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="max-w-[220px] truncate">{activeKp.name}</span>
          </>
        )}
      </nav>

      <div className="mt-4">
        <h1 className="text-lg font-bold tracking-tight">{t("learn.studyByKnowledge")}</h1>
        <p className="mt-0.5 text-xs text-foreground-secondary">
          {textbook.subjectName} · {textbook.publisherName} · {textbook.gradeName} ·{" "}
          {textbook.semesterLabel}
        </p>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[336px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-surface p-4 card-shadow lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">{t("learn.knowledgeTreeTitle")}</h2>
            <span className="text-[0.6875rem] font-semibold text-foreground-tertiary">
              {tree ? t("learn.knowledgeCount", { n: totalCount }) : t("learn.loading")}
            </span>
          </div>

          <div className="mt-3 max-h-[min(64vh,620px)] overflow-y-auto pr-1">
            {treeStatus === "loading" && (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-[7px] bg-surface-secondary" />
                ))}
              </div>
            )}

            {treeStatus === "error" && (
              <div className="py-4 text-center">
                <p className="text-xs text-foreground-secondary">{t("learn.loadErrorTitle")}</p>
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
              <p className="py-4 text-xs text-foreground-tertiary">
                {t("learn.knowledgeTreeEmpty")}
              </p>
            )}

            {treeStatus === "ready" && (tree?.length ?? 0) > 0 && (
              <KnowledgeTree
                nodes={tree ?? []}
                activeId={activeKpId}
                depth={0}
                questionsLabel={(count) => t("learn.questionsCount", { n: count })}
                noQuestionsLabel={t("learn.noQuestions")}
                onSelect={setActiveKpId}
              />
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-lg border border-border bg-surface card-shadow">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">
                {activeKp?.name ?? t("learn.knowledgeUnitsTitle")}
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
                  <div key={i} className="h-14 animate-pulse rounded-[7px] bg-surface-secondary" />
                ))}
              </div>
            )}

            {unitsStatus === "error" && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-foreground-secondary">{t("learn.loadErrorTitle")}</p>
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
                <p className="font-bold">{t("learn.knowledgeEmptyTitle")}</p>
                <p className="mt-1.5 text-sm text-foreground-secondary">
                  {t("learn.knowledgeEmptyBody")}
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
                    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-secondary text-[0.6875rem] font-extrabold text-foreground-tertiary">
                      {unit.unitIndex + 1}
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-[0.8125rem] font-bold">
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
                      <div className="mb-1 flex items-center justify-between text-[0.625rem] text-foreground-tertiary">
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
                          <Link
                            href={knowledgeQuizHref({
                              subjectId: textbook.subjectId,
                              gradeId: textbook.gradeId,
                              publisherId: textbook.publisherId,
                              knowledgePointId: activeKpId!,
                              unitIndex: unit.unitIndex,
                            })}
                          >
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
