"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import type { StudyStatsDto, StudyStatsRangeKey } from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { useMemo } from "react";
import { ChipRow } from "./chip-row";
import { METRIC_GRID, createDayLabel, durationLabel } from "./format";

const RANGES: StudyStatsRangeKey[] = ["today", "week", "month", "all"];

/** A 可切口径概览：分段 + 四指标 + 连续/最长/累计/上次学习 */
export function OverviewCard({
  stats,
  range,
  loading,
  failed,
  breakDays,
  onRangeChange,
  onRetry,
}: {
  stats: StudyStatsDto | null;
  range: StudyStatsRangeKey;
  loading: boolean;
  failed: boolean;
  /** 距上次学习超过一天时给出中断天数，否则为 null */
  breakDays: number | null;
  onRangeChange: (range: StudyStatsRangeKey) => void;
  onRetry: () => void;
}) {
  const { t } = useLocale();
  const dayLabel = useMemo(() => createDayLabel(t), [t]);

  const rangeLabels: Record<StudyStatsRangeKey, string> = {
    today: t("records.rangeToday"),
    week: t("records.rangeWeek"),
    month: t("records.rangeMonth"),
    all: t("records.rangeAll"),
  };

  const summary = stats?.rangeStats ?? null;
  const metrics = summary
    ? [
        {
          key: "questions",
          label: t("records.metricQuestions"),
          value: String(summary.questionsAnswered),
        },
        {
          key: "sessions",
          label: t("records.metricSessions"),
          value: String(summary.sessionsCompleted),
        },
        {
          key: "accuracy",
          label: t("records.metricAccuracy"),
          value: `${summary.accuracy}%`,
        },
        {
          key: "duration",
          label: t("records.metricDuration"),
          value: durationLabel(t, summary.studyDuration),
        },
      ]
    : [];

  return (
    <section className="rounded-lg border border-border bg-surface p-4 card-shadow sm:p-5">
      <ChipRow
        items={RANGES.map((key) => ({ key, label: rangeLabels[key] }))}
        active={range}
        onSelect={(key) => onRangeChange(key as StudyStatsRangeKey)}
        label={t("records.rangeGroupLabel")}
        gridClass={METRIC_GRID}
      />

      {failed ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 text-xs text-foreground-secondary">
            {t("records.loadErrorTitle")}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t("records.retryLoad")}
          </Button>
        </div>
      ) : !summary ? (
        <div className={cn("mt-4", METRIC_GRID)}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                "h-8 min-w-0 animate-pulse rounded-sm bg-border-light",
                loading && "bg-surface-secondary",
              )}
            />
          ))}
        </div>
      ) : (
        <>
          <dl className={cn("mt-3 text-center", METRIC_GRID)}>
            {metrics.map((metric) => (
              <div key={metric.key} className="min-w-0">
                <dd className="truncate text-lg font-bold tabular-nums">{metric.value}</dd>
                <dt className="mt-0.5 truncate text-xs text-foreground-tertiary">
                  {metric.label}
                </dt>
              </div>
            ))}
          </dl>
          {!!stats && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  stats.streak > 0 ? "text-primary-strong" : "text-foreground-tertiary",
                )}
              >
                <Flame className="h-3.5 w-3.5" />
                {stats.streak > 0
                  ? t("records.streakValue", { n: stats.streak })
                  : t("records.streakNone")}
              </span>
              <span className="text-border">·</span>
              <span className="text-foreground-secondary">
                {t("records.longestStreak", { n: stats.longestStreak })}
              </span>
              <span className="text-border">·</span>
              <span className="text-foreground-secondary">
                {t("records.totalDaysValue", { n: stats.totalDays })}
              </span>
              <span className="ml-auto min-w-0 truncate text-foreground-tertiary">
                {breakDays
                  ? t("records.breakDays", { n: breakDays })
                  : stats.lastActiveDate
                    ? t("records.lastActive", { date: dayLabel(stats.lastActiveDate) })
                    : t("records.lastActiveNone")}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
