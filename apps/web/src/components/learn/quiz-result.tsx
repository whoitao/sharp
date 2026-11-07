"use client";

import { RichText } from "@/components/learn/rich-text";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  correctKeys,
  formatDuration,
  isMultipleChoice,
  type QuizOutcome,
  type QuizQuestion,
} from "@/lib/learn/quiz";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Circle,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";

interface QuizResultProps {
  questions: QuizQuestion[];
  outcome: QuizOutcome;
  unitIndex: number;
  /** 再练一轮：沿用当前范围参数重新进入答题 */
  retryHref: string;
}

/** 折叠行里用纯文本摘要，去掉富文本标签与控制字符 */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\$\$?/g, "")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface/80 px-3 py-2.5">
      <b
        className={cn(
          "block text-[1.0625rem] leading-tight tracking-[-0.02em] tabular-nums",
          tone,
        )}
      >
        {value}
      </b>
      <span className="mt-0.5 block text-[0.625rem] text-foreground-tertiary">
        {label}
      </span>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs font-bold",
          tone,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function QuizResult({
  questions,
  outcome,
  unitIndex,
  retryHref,
}: QuizResultProps) {
  const { t } = useLocale();

  const accuracy =
    outcome.answeredCount > 0
      ? Math.round((outcome.correctCount / outcome.answeredCount) * 100)
      : 0;
  const unanswered = outcome.totalQuestions - outcome.answeredCount;
  const wrongQuestions = questions.filter((question) => {
    const record = outcome.records[question.id];
    return record && !record.isCorrect;
  });

  // 有题目分值就按分值折算，否则回退到正确率
  const totalScore = questions.reduce((sum, question) => sum + (question.score || 0), 0);
  const earnedScore = questions.reduce(
    (sum, question) =>
      sum +
      (outcome.records[question.id]?.isCorrect ? question.score || 0 : 0),
    0,
  );
  const scorePct = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : accuracy;

  const headline =
    accuracy >= 80
      ? t("quiz.resultGreat")
      : accuracy >= 50
        ? t("quiz.resultGood")
        : t("quiz.resultNeedsWork");

  return (
    <div className="pb-6 md:pb-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-foreground-tertiary">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 font-semibold text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("quiz.backToCatalog")}
        </Link>
      </div>

      <section
        className="rounded-xl border border-border px-6 py-6 card-shadow sm:px-6 sm:py-7"
        style={{
          background:
            "linear-gradient(120deg, hsl(var(--primary-light)), hsl(var(--surface)) 58%)",
        }}
      >
        <div className="grid items-center justify-items-center gap-5 text-center lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-6 lg:text-left">
          <div
            className="h-[142px] w-[142px] shrink-0 rounded-full p-[9px] sm:h-[152px] sm:w-[152px]"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${scorePct}%, hsl(var(--border-light)) 0)`,
            }}
          >
            <div className="flex h-full w-full items-baseline justify-center rounded-full bg-surface pt-[44px] sm:pt-[48px]">
              <b className="text-[2.5rem] leading-none tracking-[-0.05em] tabular-nums">
                {scorePct}
              </b>
              <small className="text-sm text-foreground-tertiary">/100</small>
            </div>
          </div>

          <div className="w-full min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-strong">
              {t("quiz.unitTitle", { n: unitIndex + 1 })} ·{" "}
              {t("quiz.resultTitle")}
            </p>
            <h1 className="mt-1 text-[1.375rem] font-bold tracking-[-0.04em] sm:text-[1.75rem]">
              {headline}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-foreground-secondary">
              {t("quiz.resultSummary", {
                duration: formatDuration(outcome.durationSeconds),
                correct: outcome.correctCount,
                total: outcome.totalQuestions,
              })}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat
                label={t("quiz.correctCount")}
                value={`${outcome.correctCount} / ${outcome.totalQuestions}`}
                tone="text-primary-strong"
              />
              <Stat
                label={t("quiz.duration")}
                value={formatDuration(outcome.durationSeconds)}
              />
              <Stat label={t("quiz.legendUnanswered")} value={unanswered} />
              <Stat
                label={t("quiz.wrongCount")}
                value={outcome.wrongCount}
                tone="text-destructive"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 rounded-xl border border-border bg-surface p-5 card-shadow">
          <div className="mb-3.5">
            <h2 className="text-base font-bold tracking-[-0.02em]">
              {t("quiz.wrongReview")}{" "}
              <small className="ml-1 text-xs font-normal text-foreground-tertiary">
                {t("quiz.questionsCount", { n: wrongQuestions.length })}
              </small>
            </h2>
          </div>

          {wrongQuestions.length === 0 ? (
            <p className="rounded-sm border border-border-light bg-surface-secondary px-4 py-6 text-center text-sm text-foreground-secondary">
              {t("quiz.noWrong")}
            </p>
          ) : (
            <div>
              {wrongQuestions.map((question) => {
                const record = outcome.records[question.id];
                const selected = record?.selectedKeys ?? [];
                const correct = correctKeys(question);
                const position = questions.indexOf(question) + 1;
                const multiple = isMultipleChoice(question);
                const typeLabel =
                  question.type === 3
                    ? t("quiz.judgement")
                    : multiple
                      ? t("quiz.multipleChoice")
                      : t("quiz.singleChoice");

                return (
                  <details
                    key={question.id}
                    className="group border-t border-border-light first:border-t-0"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 py-[13px] [&::-webkit-details-marker]:hidden">
                      <span className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-sm bg-destructive/10 text-xs font-bold text-destructive">
                        {String(position).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-xs font-bold">
                          {plainText(question.content)}
                        </b>
                        <span className="mt-0.5 block truncate text-[0.625rem] text-foreground-tertiary">
                          {typeLabel} · {t("quiz.yourAnswer")}{" "}
                          {selected.length > 0
                            ? selected.join(" / ")
                            : t("quiz.notAnswered")}{" "}
                          · {t("quiz.correctAnswer")} {correct.join(" / ")}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-foreground-tertiary transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="pb-3.5 pl-[37px]">
                      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="font-bold text-destructive">
                          {t("quiz.yourAnswer")}{" "}
                          {selected.length > 0
                            ? selected.join(" / ")
                            : t("quiz.notAnswered")}
                        </span>
                        <em className="font-bold not-italic text-primary-strong">
                          {t("quiz.correctAnswer")} {correct.join(" / ")}
                        </em>
                      </div>

                      <RichText
                        html={question.content}
                        className="quiz-richtext break-words"
                        style={{ fontSize: 13, lineHeight: 1.7 }}
                      />

                      {question.analysis && (
                        <div className="mt-2">
                          <p className="text-xs font-bold text-foreground-tertiary">
                            {t("quiz.analysis")}
                          </p>
                          <RichText
                            html={question.analysis}
                            className="quiz-richtext mt-1 break-words text-foreground-secondary [&_strong]:text-foreground"
                            style={{ fontSize: 13, lineHeight: 1.75 }}
                          />
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-xl border border-border bg-surface p-5 card-shadow">
            <h3 className="text-sm font-bold">
              {t("quiz.roundSummary")}
            </h3>
            <div className="mt-2.5 flex flex-col gap-2 text-xs text-foreground-secondary">
              <SummaryRow
                icon={<Target className="h-3.5 w-3.5 text-primary-strong" />}
                label={t("quiz.accuracy")}
                value={`${accuracy}%`}
                tone="text-primary-strong"
              />
              <SummaryRow
                icon={<Check className="h-3.5 w-3.5 text-primary-strong" />}
                label={t("quiz.correctCount")}
                value={outcome.correctCount}
                tone="text-primary-strong"
              />
              <SummaryRow
                icon={<X className="h-3.5 w-3.5 text-destructive" />}
                label={t("quiz.wrongCount")}
                value={outcome.wrongCount}
                tone="text-destructive"
              />
              <SummaryRow
                icon={<Circle className="h-3.5 w-3.5 text-foreground-tertiary" />}
                label={t("quiz.legendUnanswered")}
                value={unanswered}
                tone="text-foreground-secondary"
              />
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-3 w-full rounded-sm hover:border-primary hover:bg-surface-secondary hover:text-primary-strong"
            >
              <Link href={retryHref}>{t("quiz.retryRound")}</Link>
            </Button>
            <Link
              href="/learn"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-sm px-2.5 py-2 text-xs font-semibold text-foreground-secondary transition-colors hover:text-foreground"
            >
              {t("quiz.backToCatalog")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
