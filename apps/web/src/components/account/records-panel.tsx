"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchCatalog,
  fetchChapterStats,
  fetchGrades,
  fetchKnowledgePointStats,
  fetchStudyRecords,
  fetchStudyStats,
  fetchSubjects,
  knowledgeQuizHref,
  quizHref,
  type ChapterStatDto,
  type GradeDto,
  type KnowledgePointStatDto,
  type StudyRecordDto,
  type StudyStatsDto,
  type SubjectDto,
} from "@/lib/learn/api";
import { formatDuration } from "@/lib/learn/quiz";
import { cn } from "@/lib/utils";
import { ArrowRight, BarChart3, BookOpen, Flame, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type TabKey = "time" | "chapter" | "knowledge";
type LoadStatus = "loading" | "ready" | "error";

function flattenKnowledgePoints(
  nodes: KnowledgePointStatDto[],
  depth = 0,
): { node: KnowledgePointStatDto; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenKnowledgePoints(node.children, depth + 1),
  ]);
}

/** 学习记录：总览 + 按时间 / 按章节 / 按知识点三个视角，接口与移动端一致 */
export function RecordsPanel() {
  const { t, locale } = useLocale();

  const [stats, setStats] = useState<StudyStatsDto | null>(null);
  const [statsStatus, setStatsStatus] = useState<LoadStatus>("loading");

  const [tab, setTab] = useState<TabKey>("time");
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [records, setRecords] = useState<StudyRecordDto[]>([]);
  const [recordsStatus, setRecordsStatus] = useState<LoadStatus>("loading");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [textbookId, setTextbookId] = useState<string | null>(null);
  const [chapterStats, setChapterStats] = useState<ChapterStatDto[]>([]);
  const [chapterStatus, setChapterStatus] = useState<LoadStatus>("loading");

  const [kpStats, setKpStats] = useState<KnowledgePointStatDto[]>([]);
  const [kpStatus, setKpStatus] = useState<LoadStatus>("loading");

  // 年级 / 科目字典只拉一次
  useEffect(() => {
    let alive = true;
    Promise.all([fetchGrades(), fetchSubjects()])
      .then(([gradeList, subjectList]) => {
        if (!alive) return;
        setGrades(gradeList);
        setSubjects(subjectList);
      })
      .catch(() => {
        /* 字典失败不阻塞记录展示 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const loadStats = useCallback(async () => {
    setStatsStatus("loading");
    try {
      setStats(await fetchStudyStats());
      setStatsStatus("ready");
    } catch {
      setStatsStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const loadRecords = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setRecordsStatus("loading");
      try {
        const data = await fetchStudyRecords({
          page: targetPage,
          pageSize: 20,
          gradeId: gradeId || null,
          subjectId: subjectId || null,
        });
        setRecords((prev) => (append ? [...prev, ...data.data] : data.data));
        setPage(data.page);
        setTotalPages(data.totalPages);
        setRecordsStatus("ready");
      } catch {
        if (!append) setRecordsStatus("error");
      } finally {
        setLoadingMore(false);
      }
    },
    [gradeId, subjectId],
  );

  useEffect(() => {
    void loadRecords(1, false);
  }, [loadRecords]);

  // 当前教材用于「按章节」统计
  useEffect(() => {
    let alive = true;
    fetchCatalog()
      .then((catalog) => {
        if (alive) setTextbookId(catalog.selectedTextbookId ?? null);
      })
      .catch(() => {
        if (alive) setTextbookId(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "chapter") return;
    if (!textbookId) {
      setChapterStats([]);
      setChapterStatus("ready");
      return;
    }
    let alive = true;
    setChapterStatus("loading");
    fetchChapterStats(textbookId)
      .then((data) => {
        if (!alive) return;
        setChapterStats(data);
        setChapterStatus("ready");
      })
      .catch(() => {
        if (alive) setChapterStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [tab, textbookId]);

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );
  const stageId = selectedGrade?.stageId ?? null;

  useEffect(() => {
    if (tab !== "knowledge") return;
    let alive = true;
    setKpStatus("loading");
    fetchKnowledgePointStats({ stageId, subjectId: subjectId || null })
      .then((data) => {
        if (!alive) return;
        setKpStats(data);
        setKpStatus("ready");
      })
      .catch(() => {
        if (alive) setKpStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [tab, stageId, subjectId]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "2-digit",
        day: "2-digit",
      }),
    [locale],
  );

  const today = stats?.recentStats.find(
    (item) =>
      new Date(item.date).toDateString() === new Date().toDateString(),
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "time", label: t("records.tabTime") },
    { key: "chapter", label: t("records.tabChapter") },
    { key: "knowledge", label: t("records.tabKnowledge") },
  ];

  const knowledgeRows = useMemo(
    () => flattenKnowledgePoints(kpStats),
    [kpStats],
  );

  const retryHref = (record: StudyRecordDto): string | null => {
    if (record.chapterId) return quizHref(record.chapterId, record.unitIndex);
    if (record.knowledgePointId && record.subjectId) {
      return knowledgeQuizHref({
        subjectId: record.subjectId,
        gradeId: record.gradeId ?? null,
        publisherId: null,
        knowledgePointId: record.knowledgePointId,
        unitIndex: record.unitIndex,
      });
    }
    return null;
  };

  const sourceLabel = (record: StudyRecordDto): string => {
    const chapter = [record.textbookLabel, record.chapterName]
      .filter(Boolean)
      .join(" · ");
    if (chapter) return chapter;
    if (record.scopeType === "knowledge") return t("records.knowledgePractice");
    if (record.scopeType === "bank") return t("records.bankPractice");
    return t("records.practice");
  };

  return (
    <div className="min-w-0 pb-2">
      {/* 今日概览 + 累计指标 */}
      {statsStatus === "loading" ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-10 text-sm text-foreground-secondary card-shadow">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("records.loading")}
        </div>
      ) : statsStatus === "error" ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
          <p className="text-sm font-semibold">{t("records.loadErrorTitle")}</p>
          <p className="mt-1 text-xs text-foreground-secondary">
            {t("records.loadErrorBody")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void loadStats()}
          >
            {t("records.retryLoad")}
          </Button>
        </div>
      ) : (
        <section className="rounded-lg border border-border bg-surface p-4 card-shadow sm:p-5">
          {!!stats?.streak && (
            <div className="mb-2 flex items-center justify-end gap-1 text-xs font-semibold text-primary-strong">
              <Flame className="h-3.5 w-3.5" />
              {t("records.streakDays", { n: stats.streak })}
            </div>
          )}
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              {
                value: today?.questionsAnswered ?? 0,
                label: t("records.todayQuestions"),
              },
              {
                value: today?.sessionsCompleted ?? 0,
                label: t("records.todaySessions"),
              },
              {
                value: formatDuration(today?.studyDuration ?? 0),
                label: t("records.todayDuration"),
              },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <dd className="text-lg font-bold tabular-nums">{item.value}</dd>
                <dt className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
          <div className="my-3 h-px bg-border-light" />
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { value: stats?.totalDays ?? 0, label: t("records.totalDays") },
              {
                value: stats?.totalQuestions ?? 0,
                label: t("records.totalQuestions"),
              },
              { value: `${stats?.accuracy ?? 0}%`, label: t("records.accuracy") },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <dd className="text-sm font-semibold tabular-nums text-foreground-secondary">
                  {item.value}
                </dd>
                <dt className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 三视角切换 */}
      <div
        role="tablist"
        aria-label={t("account.records")}
        className="mt-3 flex gap-1 rounded-[10px] bg-surface-secondary p-1"
      >
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={cn(
                "min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-surface font-semibold text-primary-strong shadow-sm"
                  : "font-medium text-foreground-secondary hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 年级 / 科目筛选：时间线与知识点统计共用 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={gradeId}
          onChange={(event) => setGradeId(event.target.value)}
          aria-label={t("records.filterGrade")}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary sm:max-w-[160px]"
        >
          <option value="">{t("records.allGrades")}</option>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          aria-label={t("records.filterSubject")}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary sm:max-w-[160px]"
        >
          <option value="">{t("records.allSubjects")}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {tab === "time" && (
        <div className="mt-3">
          {recordsStatus === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("records.loading")}
            </div>
          ) : recordsStatus === "error" ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
              <p className="text-sm font-semibold">{t("records.loadErrorTitle")}</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("records.loadErrorBody")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void loadRecords(1, false)}
              >
                {t("records.retryLoad")}
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
              <BarChart3 className="mx-auto h-9 w-9 text-foreground-tertiary" />
              <p className="mt-3 text-sm font-semibold">{t("records.emptyTitle")}</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("records.emptyBody")}
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-3 space-y-2.5">
                {records.map((record) => {
                  const percentage =
                    record.totalQuestions > 0
                      ? Math.round(
                          (record.correctCount / record.totalQuestions) * 100,
                        )
                      : 0;
                  const href = retryHref(record);
                  const time = record.finishedAt ?? record.startedAt;
                  return (
                    <li
                      key={record.id}
                      className="rounded-lg border border-border bg-surface p-3.5 card-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {sourceLabel(record)}
                          </p>
                          {time && (
                            <p className="mt-1 text-xs text-foreground-secondary">
                              {dateFormatter.format(new Date(time))}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                            percentage >= 80
                              ? "bg-primary-light text-primary-strong"
                              : percentage >= 60
                                ? "bg-surface-secondary text-foreground-secondary"
                                : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {percentage}%
                        </span>
                      </div>

                      <dl className="mt-3 grid grid-cols-4 gap-1 text-center">
                        <div className="min-w-0">
                          <dd className="text-sm font-semibold tabular-nums">
                            {record.totalQuestions}
                          </dd>
                          <dt className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                            {t("records.questions")}
                          </dt>
                        </div>
                        <div className="min-w-0">
                          <dd className="text-sm font-semibold tabular-nums text-primary-strong">
                            {record.correctCount}
                          </dd>
                          <dt className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                            {t("records.correct")}
                          </dt>
                        </div>
                        <div className="min-w-0">
                          <dd className="text-sm font-semibold tabular-nums text-destructive">
                            {record.wrongCount}
                          </dd>
                          <dt className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                            {t("records.wrong")}
                          </dt>
                        </div>
                        <div className="min-w-0">
                          <dd className="text-sm font-semibold tabular-nums">
                            {formatDuration(record.durationSeconds ?? 0)}
                          </dd>
                          <dt className="mt-0.5 truncate text-[11px] text-foreground-tertiary">
                            {t("records.duration")}
                          </dt>
                        </div>
                      </dl>

                      {href && (
                        <div className="mt-3 flex justify-end">
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-strong transition-colors hover:text-primary"
                          >
                            {t("records.retry")}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
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
                    onClick={() => void loadRecords(page + 1, true)}
                  >
                    {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t("records.loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "chapter" && (
        <div className="mt-3">
          {!textbookId ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
              <BookOpen className="mx-auto h-9 w-9 text-foreground-tertiary" />
              <p className="mt-3 text-sm font-semibold">
                {t("records.chapterNeedsTextbook")}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/learn">{t("records.goLearn")}</Link>
              </Button>
            </div>
          ) : chapterStatus === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("records.loading")}
            </div>
          ) : chapterStatus === "error" ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
              <p className="text-sm font-semibold">{t("records.loadErrorTitle")}</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("records.loadErrorBody")}
              </p>
            </div>
          ) : chapterStats.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
              <BarChart3 className="mx-auto h-9 w-9 text-foreground-tertiary" />
              <p className="mt-3 text-sm font-semibold">{t("records.chapterEmpty")}</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {chapterStats.map((item) => {
                const ratio =
                  item.totalQuestions > 0
                    ? Math.min(1, item.answeredQuestions / item.totalQuestions)
                    : 0;
                const accuracy =
                  item.answeredQuestions > 0
                    ? Math.round(
                        (item.correctQuestions / item.answeredQuestions) * 100,
                      )
                    : 0;
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border bg-surface p-3.5 card-shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      {item.lastPracticedAt && (
                        <span className="shrink-0 text-xs text-foreground-tertiary">
                          {t("records.lastPracticed", {
                            time: shortDateFormatter.format(
                              new Date(item.lastPracticedAt),
                            ),
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border-light">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-foreground-tertiary">
                      <span className="truncate">
                        {t("records.answeredOfTotal", {
                          answered: item.answeredQuestions,
                          total: item.totalQuestions,
                        })}
                      </span>
                      <span className="shrink-0">
                        {t("records.accuracyValue", { n: accuracy })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "knowledge" && (
        <div className="mt-3">
          {kpStatus === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("records.loading")}
            </div>
          ) : kpStatus === "error" ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
              <p className="text-sm font-semibold">{t("records.loadErrorTitle")}</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("records.loadErrorBody")}
              </p>
            </div>
          ) : knowledgeRows.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
              <BarChart3 className="mx-auto h-9 w-9 text-foreground-tertiary" />
              <p className="mt-3 text-sm font-semibold">{t("records.knowledgeEmpty")}</p>
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface card-shadow">
              {knowledgeRows.map(({ node, depth }, index) => {
                const accuracy =
                  node.answeredQuestions > 0
                    ? Math.round(
                        (node.correctQuestions / node.answeredQuestions) * 100,
                      )
                    : 0;
                return (
                  <div
                    key={node.id}
                    className={cn(
                      "flex items-center gap-2 py-2.5 pr-3",
                      index !== knowledgeRows.length - 1 && "border-b border-border-light",
                    )}
                    style={{ paddingLeft: 12 + depth * 12 }}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        depth === 0
                          ? "font-semibold text-foreground"
                          : "text-foreground-secondary",
                      )}
                    >
                      {node.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-foreground-secondary">
                      {node.answeredQuestions}/{node.totalQuestions}
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-foreground-tertiary">
                      {accuracy}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
