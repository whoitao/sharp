"use client";

import { useLocale } from "@/lib/i18n";
import type { DailySeriesPointDto } from "@/lib/learn/api";
import { beijingDateStr } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { HEAT_BG, createDayLabel, durationLabel, heatLevel } from "./format";

/** B 近 14 天热力条：断签用虚线空框，今天加描边，点选把时间轴定位到当天 */
export function HeatStrip({
  series,
  selectedDate,
  onSelect,
}: {
  series: DailySeriesPointDto[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  const { t } = useLocale();
  const dayLabel = useMemo(() => createDayLabel(t), [t]);
  const todayStr = beijingDateStr(new Date()) ?? "";

  const maxAnswered = series.reduce(
    (max, point) => Math.max(max, point.questionsAnswered),
    0,
  );
  const selected = series.find((point) => point.date === selectedDate) ?? null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 card-shadow sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{t("records.heatTitle")}</h3>
        <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary">
          <span>{t("records.heatLess")}</span>
          {[1, 2, 3, 4].map((level) => (
            <span key={level} className={cn("h-2.5 w-2.5 rounded-sm", HEAT_BG[level])} />
          ))}
          <span>{t("records.heatMore")}</span>
        </div>
      </div>

      {/* 宽屏一行放满 14 天，窄屏退回 7 列两行；方块边长始终跟着列宽走 */}
      <div className="mt-3 grid grid-cols-7 gap-1.5 md:grid-cols-[repeat(14,minmax(0,1fr))]">
        {series.map((point) => {
          const level = heatLevel(point.questionsAnswered, maxAnswered);
          const isSelected = point.date === selectedDate;
          const isToday = point.date === todayStr;
          return (
            <button
              key={point.date}
              type="button"
              aria-pressed={isSelected}
              title={t("records.heatCellLabel", {
                date: dayLabel(point.date),
                n: point.questionsAnswered,
              })}
              aria-label={t("records.heatCellLabel", {
                date: dayLabel(point.date),
                n: point.questionsAnswered,
              })}
              onClick={() => onSelect(isSelected ? null : point.date)}
              className={cn(
                "aspect-square rounded-sm border transition-colors",
                level === 0 ? "border-dashed border-border" : "border-transparent",
                HEAT_BG[level],
                isSelected && "border-solid border-2 border-primary",
                isToday && !isSelected && "ring-1 ring-foreground-tertiary",
              )}
            />
          );
        })}
      </div>

      {!!selected && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="shrink-0 font-semibold text-foreground">
            {dayLabel(selected.date)}
          </span>
          <span className="min-w-0 flex-1 truncate text-foreground-secondary">
            {selected.questionsAnswered === 0
              ? t("records.heatSelectedEmpty")
              : t("records.dayMeta", {
                  questions: t("records.questionsUnit", { n: selected.questionsAnswered }),
                  sessions: t("records.sessionsUnit", { n: selected.sessionsCompleted }),
                  duration: durationLabel(t, selected.studyDuration),
                })}
          </span>
          <button
            type="button"
            aria-label={t("records.clearDayFilter")}
            onClick={() => onSelect(null)}
            className="shrink-0 font-semibold text-primary-strong transition-colors hover:text-primary"
          >
            {t("records.scopeAll")}
          </button>
        </div>
      )}
    </section>
  );
}
