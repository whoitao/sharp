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
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";

interface QuizResultProps {
  questions: QuizQuestion[];
  outcome: QuizOutcome;
  unitIndex: number;
}

export function QuizResult({ questions, outcome, unitIndex }: QuizResultProps) {
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

  return (
    <div className="pb-6 md:pb-8">
      <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-tertiary">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 font-semibold text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("quiz.backToCatalog")}
        </Link>
        <span>·</span>
        <span>{t("quiz.unitTitle", { n: unitIndex + 1 })}</span>
        <span>·</span>
        <span>{t("quiz.resultTitle")}</span>
      </div>

      <section className="mt-3 rounded-lg border border-border bg-surface p-6 card-shadow sm:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-primary-light bg-primary-light/40">
            <span className="text-2xl font-extrabold tabular-nums text-primary-strong">
              {accuracy}%
            </span>
            <span className="mt-0.5 text-[10px] font-semibold text-foreground-tertiary">
              {t("quiz.accuracy")}
            </span>
          </div>

          <div className="w-full">
            <h1 className="text-center text-lg font-bold tracking-tight sm:text-left">
              {t("quiz.resultTitle")}
            </h1>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-surface-secondary px-3 py-2">
                <dt className="text-[11px] text-foreground-tertiary">
                  {t("quiz.correctCount")}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-primary-strong">
                  {outcome.correctCount}
                </dd>
              </div>
              <div className="rounded-md bg-surface-secondary px-3 py-2">
                <dt className="text-[11px] text-foreground-tertiary">
                  {t("quiz.wrongCount")}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-destructive">
                  {outcome.wrongCount}
                </dd>
              </div>
              <div className="rounded-md bg-surface-secondary px-3 py-2">
                <dt className="text-[11px] text-foreground-tertiary">
                  {t("quiz.legendUnanswered")}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground-secondary">
                  {unanswered}
                </dd>
              </div>
              <div className="rounded-md bg-surface-secondary px-3 py-2">
                <dt className="text-[11px] text-foreground-tertiary">
                  {t("quiz.duration")}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums">
                  {formatDuration(outcome.durationSeconds)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/learn">{t("quiz.done")}</Link>
          </Button>
          <span className="text-xs text-foreground-tertiary">
            {t("quiz.answered", {
              answered: outcome.answeredCount,
              total: outcome.totalQuestions,
            })}
          </span>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-bold">{t("quiz.wrongReview")}</h2>

        {wrongQuestions.length === 0 ? (
          <p className="mt-2 rounded-lg border border-border-light bg-surface px-4 py-6 text-center text-sm text-foreground-secondary">
            {t("quiz.noWrong")}
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {wrongQuestions.map((question) => {
              const record = outcome.records[question.id];
              const selected = record?.selectedKeys ?? [];
              const correct = correctKeys(question);
              const position = questions.indexOf(question) + 1;
              const multiple = isMultipleChoice(question);

              return (
                <article
                  key={question.id}
                  className="rounded-lg border border-border bg-surface p-4 card-shadow sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold tabular-nums text-foreground-tertiary">
                      {position} / {questions.length}
                    </span>
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-strong">
                      {multiple ? t("quiz.multipleChoice") : t("quiz.singleChoice")}
                    </span>
                  </div>

                  <RichText
                    html={question.content}
                    className="mt-2 text-[15px] leading-7"
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-foreground-secondary">
                      {t("quiz.yourAnswer")}:{" "}
                      <b className="font-semibold text-destructive">
                        {selected.length > 0
                          ? selected.join(" / ")
                          : t("quiz.notAnswered")}
                      </b>
                    </span>
                    <span className="text-foreground-secondary">
                      {t("quiz.correctAnswer")}:{" "}
                      <b className="font-semibold text-primary-strong">
                        {correct.join(" / ")}
                      </b>
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {question.options.map((option) => {
                      const isCorrect = option.isCorrect;
                      const isPicked = selected.includes(option.optionKey);
                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                            isCorrect
                              ? "border-primary bg-primary-light"
                              : isPicked
                                ? "border-destructive/50 bg-destructive/5"
                                : "border-border-light bg-surface-secondary/60",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-extrabold",
                              isCorrect
                                ? "bg-primary text-primary-foreground"
                                : isPicked
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-surface-secondary text-foreground-tertiary",
                            )}
                          >
                            {option.optionKey}
                          </span>
                          <RichText
                            html={option.content}
                            className="min-w-0 flex-1 text-sm [&_p]:my-0 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                          />
                          <span className="flex shrink-0 items-center gap-1.5">
                            {multiple && isCorrect && !isPicked && (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                                {t("quiz.missed")}
                              </span>
                            )}
                            {isCorrect && (
                              <Check className="h-4 w-4 text-primary-strong" />
                            )}
                            {isPicked && !isCorrect && (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {question.analysis && (
                    <div className="mt-3 rounded-md border border-border-light bg-surface-secondary p-3.5">
                      <p className="text-[11px] font-bold text-foreground-tertiary">
                        {t("quiz.analysis")}
                      </p>
                      <RichText
                        html={question.analysis}
                        className="mt-1 text-sm leading-6"
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
