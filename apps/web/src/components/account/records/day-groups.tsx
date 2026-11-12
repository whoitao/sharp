"use client";

import { beijingClock } from "@/lib/datetime";
import { useLocale } from "@/lib/i18n";
import type { StudyRecordDto } from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  accuracyOf,
  accuracyTone,
  durationLabel,
  type RecordDayGroup,
  type Translate,
} from "./format";

const WRONG_HREF = "/account/wrong-questions";

function RecordRow({
  record,
  href,
  source,
  t,
}: {
  record: StudyRecordDto;
  href: string | null;
  source: string;
  t: Translate;
}) {
  const accuracy = accuracyOf(record.correctCount, record.totalQuestions);
  const content = (
    <>
      <span className="w-11 shrink-0 tabular-nums text-foreground-tertiary">
        {beijingClock(record.finishedAt ?? record.startedAt)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{source}</span>
      <span className="shrink-0 whitespace-nowrap tabular-nums text-foreground-secondary">
        {t("records.questionsUnit", { n: record.totalQuestions })}
      </span>
      <span
        className={cn(
          "w-12 shrink-0 text-right font-bold tabular-nums",
          accuracyTone(accuracy, true),
        )}
      >
        {accuracy}%
      </span>
      <span className="w-20 shrink-0 text-right tabular-nums text-foreground-tertiary">
        {durationLabel(t, record.durationSeconds)}
      </span>
      {href && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary" />}
    </>
  );

  const className = cn(
    "flex items-center gap-3 px-3.5 py-2.5 text-xs",
    href && "transition-colors hover:bg-surface-secondary",
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** E 按天分组时间轴：组头是当天汇总，组脚给错题一个出口 */
export function DayGroups({
  groups,
  dayLabel,
  hrefFor,
  sourceFor,
}: {
  groups: RecordDayGroup[];
  dayLabel: (dateStr: string) => string;
  hrefFor: (record: StudyRecordDto) => string | null;
  sourceFor: (record: StudyRecordDto) => string;
}) {
  const { t } = useLocale();

  return (
    <>
      {groups.map((group) => (
        <section key={group.date} className="mt-4">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h3 className="text-sm font-bold">{dayLabel(group.date)}</h3>
            <p className="min-w-0 truncate text-xs tabular-nums text-foreground-tertiary">
              {t("records.dayMeta", {
                questions: t("records.questionsUnit", { n: group.questions }),
                sessions: t("records.sessionsUnit", { n: group.records.length }),
                duration: durationLabel(t, group.duration),
              })}
            </p>
          </div>
          <div className="mt-1.5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface card-shadow">
            {group.records.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                href={hrefFor(record)}
                source={sourceFor(record)}
                t={t}
              />
            ))}
            {group.wrong > 0 && (
              <Link
                href={WRONG_HREF}
                className="flex items-center gap-2 px-3.5 py-2.5 text-xs transition-colors hover:bg-surface-secondary"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span className="min-w-0 flex-1 truncate text-destructive">
                  {t("records.wrongOfDay", { n: group.wrong })}
                </span>
                <span className="shrink-0 font-semibold text-primary-strong">
                  {t("records.goWrongBook")}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary-strong" />
              </Link>
            )}
          </div>
        </section>
      ))}
    </>
  );
}
