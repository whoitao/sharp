"use client";

import { Button } from "@/components/ui/button";
import { beijingDateStr, dayNumber } from "@/lib/datetime";
import { useLocale } from "@/lib/i18n";
import {
  fetchChapterStats,
  fetchKnowledgePointStats,
  fetchStudyRecords,
  fetchStudyStats,
  knowledgeQuizHref,
  quizHref,
  type ChapterStatDto,
  type KnowledgePointStatDto,
  type StudyRecordDto,
  type StudyStatsDto,
  type StudyStatsRangeKey,
} from "@/lib/learn/api";
import { useStudyScope } from "@/lib/study-scope";
import { cn } from "@/lib/utils";
import { BarChart3, BookOpen, CloudOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChapterList } from "./records/chapter-list";
import { ChipRow } from "./records/chip-row";
import { createDayLabel, groupRecordsByDay } from "./records/format";
import { DayGroups } from "./records/day-groups";
import { HeatStrip } from "./records/heat-strip";
import { KnowledgeTree } from "./records/knowledge-tree";
import { OverviewCard } from "./records/overview-card";

type TabKey = "time" | "chapter" | "knowledge";
type ScopeKey = "all" | NonNullable<StudyRecordDto["scopeType"]>;
type Status = "loading" | "ready" | "error";

const SCOPES: ScopeKey[] = ["all", "chapter", "knowledge", "bank"];
/** 按天分组后一屏可能只覆盖 1~2 天，30 条比 20 条更容易凑满一组 */
const PAGE_SIZE = 30;

/** 空 / 错误 / 首次使用共用的居中状态卡 */
function StateCard({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: typeof BarChart3;
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
      <Icon className="mx-auto h-9 w-9 text-foreground-tertiary" />
      <p className="mt-3 text-sm font-bold">{title}</p>
      {!!body && <p className="mt-1 text-xs text-foreground-secondary">{body}</p>}
      {!!actionLabel && (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={actionHref ?? "/learn"}>{actionLabel}</Link>
        </Button>
      )}
      {!actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {t("records.retryLoad")}
        </Button>
      )}
    </div>
  );
}

function LoadingRow() {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary">
      <Loader2 className="h-4 w-4 animate-spin" />
      {t("records.loading")}
    </div>
  );
}

/** 学情分析：口径概览 + 近 14 天热力条 + 按天 / 按章节 / 按知识点三视角，接口与移动端一致 */
export function RecordsPanel() {
  const { t } = useLocale();
  // 年级 / 科目 / 当前教材统一取自导航栏的全局学习范围
  const { ready: scopeReady, gradeId, subjectId, grades, textbook } = useStudyScope();

  const [range, setRange] = useState<StudyStatsRangeKey>("all");
  const [tab, setTab] = useState<TabKey>("time");
  const [scope, setScope] = useState<ScopeKey>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [stats, setStats] = useState<StudyStatsDto | null>(null);
  const [statsStatus, setStatsStatus] = useState<Status>("loading");

  const [records, setRecords] = useState<StudyRecordDto[]>([]);
  const [recordsStatus, setRecordsStatus] = useState<Status>("loading");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [chapterStats, setChapterStats] = useState<ChapterStatDto[]>([]);
  const [chapterStatus, setChapterStatus] = useState<Status>("loading");
  const [chapterReload, setChapterReload] = useState(0);

  const [kpStats, setKpStats] = useState<KnowledgePointStatDto[]>([]);
  const [kpStatus, setKpStatus] = useState<Status>("loading");
  const [kpReload, setKpReload] = useState(0);

  const textbookId = textbook?.id ?? null;
  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );

  const loadStats = useCallback(async () => {
    setStatsStatus("loading");
    try {
      setStats(await fetchStudyStats({ range }));
      setStatsStatus("ready");
    } catch {
      setStatsStatus("error");
    }
  }, [range]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const loadRecords = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!scopeReady) return;
      if (append) setLoadingMore(true);
      else setRecordsStatus("loading");
      try {
        const data = await fetchStudyRecords({
          page: targetPage,
          pageSize: PAGE_SIZE,
          gradeId: gradeId || null,
          subjectId: subjectId || null,
          scopeType: scope === "all" ? undefined : scope,
          date: selectedDate,
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
    [scopeReady, gradeId, subjectId, scope, selectedDate],
  );

  useEffect(() => {
    if (!scopeReady) return;
    void loadRecords(1, false);
  }, [scopeReady, loadRecords]);

  // 「按章节」统计跟随全局当前教材：胶囊切换教材后重新取章节统计
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
  }, [tab, textbookId, chapterReload]);

  useEffect(() => {
    if (tab !== "knowledge" || !scopeReady) return;
    let alive = true;
    setKpStatus("loading");
    fetchKnowledgePointStats({
      stageId: selectedGrade?.stageId ?? null,
      subjectId: subjectId || null,
    })
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
  }, [tab, scopeReady, selectedGrade, subjectId, kpReload]);

  const dayLabel = useMemo(() => createDayLabel(t), [t]);

  /** 「上次学习」落在昨天之后才算断签：与后端 streak 口径一致 */
  const breakDays = useMemo(() => {
    if (!stats?.lastActiveDate) return null;
    const todayStr = beijingDateStr(new Date());
    if (!todayStr) return null;
    const gap = dayNumber(todayStr) - dayNumber(stats.lastActiveDate);
    return gap > 1 ? gap : null;
  }, [stats]);

  const groups = useMemo(() => groupRecordsByDay(records), [records]);

  const scopeLabel: Record<ScopeKey, string> = {
    all: t("records.scopeAll"),
    chapter: t("records.scopeChapter"),
    knowledge: t("records.scopeKnowledge"),
    bank: t("records.scopeBank"),
  };

  /** 行标题：有章节就报「教材 · 章节」，否则按学习来源兜底 */
  const sourceFor = (record: StudyRecordDto): string => {
    const chapter = [record.textbookLabel, record.chapterName]
      .filter(Boolean)
      .join(" · ");
    if (chapter) return chapter;
    if (record.scopeType === "knowledge") return t("records.knowledgePractice");
    if (record.scopeType === "bank") return t("records.bankPractice");
    return t("records.practice");
  };

  const hrefFor = useCallback((record: StudyRecordDto): string | null => {
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
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "time", label: t("records.tabTime") },
    { key: "chapter", label: t("records.tabChapter") },
    { key: "knowledge", label: t("records.tabKnowledge") },
  ];

  const timeBody = () => {
    if (recordsStatus === "loading") return <LoadingRow />;
    if (recordsStatus === "error" && records.length === 0) {
      return (
        <StateCard
          icon={CloudOff}
          title={t("records.loadErrorTitle")}
          body={t("records.loadErrorBody")}
          onAction={() => void loadRecords(1, false)}
        />
      );
    }
    if (records.length === 0) {
      // 从来没答过题才是首次引导，否则是当前筛选/选中日期下没有记录
      return stats && stats.totalDays > 0 ? (
        <StateCard
          icon={BarChart3}
          title={t("records.filteredEmptyTitle")}
          body={t("records.filteredEmptyBody")}
        />
      ) : (
        <StateCard
          icon={BookOpen}
          title={t("records.emptyTitle")}
          body={t("records.emptyBody")}
          actionLabel={t("learn.enterStudy")}
        />
      );
    }
    return (
      <>
        <DayGroups groups={groups} dayLabel={dayLabel} hrefFor={hrefFor} sourceFor={sourceFor} />
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
    );
  };

  const chapterBody = () => {
    if (!textbookId) {
      return (
        <StateCard
          icon={BookOpen}
          title={t("records.needTextbookTitle")}
          body={t("records.needTextbookBody")}
          actionLabel={t("records.goLearn")}
          actionHref="/account/textbook"
        />
      );
    }
    if (chapterStatus === "loading") return <LoadingRow />;
    if (chapterStatus === "error") {
      return (
        <StateCard
          icon={CloudOff}
          title={t("records.loadErrorTitle")}
          body={t("records.loadErrorBody")}
          onAction={() => setChapterReload((key) => key + 1)}
        />
      );
    }
    if (chapterStats.length === 0) {
      return <StateCard icon={BarChart3} title={t("records.noChapterData")} />;
    }
    return <ChapterList chapters={chapterStats} dayLabel={dayLabel} />;
  };

  const knowledgeBody = () => {
    if (kpStatus === "loading") return <LoadingRow />;
    if (kpStatus === "error") {
      return (
        <StateCard
          icon={CloudOff}
          title={t("records.loadErrorTitle")}
          body={t("records.loadErrorBody")}
          onAction={() => setKpReload((key) => key + 1)}
        />
      );
    }
    if (kpStats.length === 0) {
      return <StateCard icon={BarChart3} title={t("records.knowledgeEmpty")} />;
    }
    return <KnowledgeTree nodes={kpStats} />;
  };

  return (
    <div className="min-w-0 pb-2">
      <OverviewCard
        stats={stats}
        range={range}
        loading={statsStatus === "loading"}
        // 请求失败，或接口没带回 rangeStats（旧响应结构），都不该让用户对着无限骨架看
        failed={statsStatus !== "loading" && !stats?.rangeStats}
        breakDays={breakDays}
        onRangeChange={setRange}
        onRetry={() => void loadStats()}
      />

      {(stats?.dailySeries?.length ?? 0) > 0 && (
        <div className="mt-3">
          <HeatStrip
            series={stats?.dailySeries ?? []}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>
      )}

      {/* C 三视角切换 */}
      <div
        role="tablist"
        aria-label={t("account.records")}
        className="mt-3 flex gap-1 rounded-md bg-surface-secondary p-1"
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

      {tab === "time" && (
        <div className="mt-3">
          {/* D 来源筛选 */}
          <ChipRow
            items={SCOPES.map((key) => ({ key, label: scopeLabel[key] }))}
            active={scope}
            onSelect={(key) => setScope(key as ScopeKey)}
            pill
            label={t("records.scopeGroupLabel")}
          />
          <div className="mt-3">{timeBody()}</div>
        </div>
      )}

      {tab === "chapter" && chapterBody()}
      {tab === "knowledge" && <div className="mt-3">{knowledgeBody()}</div>}
    </div>
  );
}
