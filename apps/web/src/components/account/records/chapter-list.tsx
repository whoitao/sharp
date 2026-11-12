"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { beijingDateStr } from "@/lib/datetime";
import {
  fetchUnits,
  quizHref,
  type ChapterStatDto,
  type UnitDto,
} from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { accuracyOf, accuracyTone } from "./format";

type Status = "loading" | "ready" | "error";

/** 章下展开的单元列表：与移动端「点章节进单元列表」同一入口 */
function ChapterUnits({
  chapterId,
  chapterName,
}: {
  chapterId: string;
  chapterName: string;
}) {
  const { t } = useLocale();
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchUnits(chapterId)
      .then((data) => {
        if (!alive) return;
        setUnits(data.units);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [chapterId, reload]);

  if (status === "loading") {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-foreground-secondary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("records.loading")}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-foreground-secondary">
          {t("records.loadErrorTitle")}
        </p>
        <Button variant="outline" size="sm" onClick={() => setReload((key) => key + 1)}>
          {t("records.retryLoad")}
        </Button>
      </div>
    );
  }
  if (units.length === 0) {
    return <p className="mt-3 text-xs text-foreground-tertiary">{t("learn.noQuestions")}</p>;
  }

  return (
    <div className="mt-3 divide-y divide-border-light rounded-md border border-border-light">
      {units.map((unit) => {
        const started = unit.answeredCount > 0;
        const accuracy = accuracyOf(unit.correctCount, unit.answeredCount);
        return (
          <div key={unit.unitIndex} className="flex items-center gap-3 px-3 py-2 text-xs">
            <span className="shrink-0 font-semibold text-foreground">
              {t("learn.unitName", { n: unit.unitIndex })}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground-tertiary">
              {t("learn.unitStats", {
                answered: unit.answeredCount,
                total: unit.totalQuestions,
              })}
            </span>
            <span
              className={cn(
                "shrink-0 font-bold tabular-nums",
                accuracyTone(accuracy, started),
              )}
            >
              {started ? `${accuracy}%` : t("records.notStarted")}
            </span>
            <Link
              href={quizHref(chapterId, unit.unitIndex, chapterName)}
              className="shrink-0 font-semibold text-primary-strong transition-colors hover:text-primary"
            >
              {started ? t("records.retry") : t("learn.start")}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/** F 章节进度：含未开始的章，展开即该章的单元列表 */
export function ChapterList({
  chapters,
  dayLabel,
}: {
  chapters: ChapterStatDto[];
  dayLabel: (dateStr: string) => string;
}) {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="mt-3 space-y-2.5">
      {chapters.map((chapter) => {
        const started = chapter.answeredQuestions > 0;
        const accuracy = accuracyOf(chapter.correctQuestions, chapter.answeredQuestions);
        const ratio =
          chapter.totalQuestions > 0
            ? Math.min(1, chapter.answeredQuestions / chapter.totalQuestions)
            : 0;
        const open = openId === chapter.id;
        const lastDay = chapter.lastPracticedAt
          ? dayLabel(beijingDateStr(chapter.lastPracticedAt) ?? "")
          : "";
        return (
          <li
            key={chapter.id}
            className="rounded-lg border border-border bg-surface p-3.5 card-shadow"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : chapter.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm font-semibold",
                  started ? "text-foreground" : "text-foreground-tertiary",
                )}
              >
                {chapter.name}
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs font-bold tabular-nums",
                  accuracyTone(accuracy, started),
                )}
              >
                {started ? `${accuracy}%` : t("records.notStarted")}
              </span>
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-foreground-tertiary" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-foreground-tertiary" />
              )}
            </button>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border-light">
              <div
                className={cn("h-full rounded-full", started ? "bg-primary" : "bg-transparent")}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-foreground-tertiary">
              <span className="min-w-0 truncate tabular-nums">
                {t("records.progressValue", {
                  answered: chapter.answeredQuestions,
                  total: chapter.totalQuestions,
                })}
              </span>
              {!!lastDay && (
                <span className="shrink-0">{t("records.lastPracticed", { time: lastDay })}</span>
              )}
            </div>
            {open && <ChapterUnits chapterId={chapter.id} chapterName={chapter.name} />}
          </li>
        );
      })}
    </ul>
  );
}
