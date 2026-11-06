"use client";

import { RichText } from "@/components/learn/rich-text";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { AppApiError } from "@/lib/learn/api";
import {
  correctKeys,
  finishStudy,
  formatDuration,
  isAnswerCorrect,
  isMultipleChoice,
  quizSessionKey,
  type AnswerPayload,
  type PreviousStudy,
  type QuizOption,
  type QuizOutcome,
  type QuizQuestion,
  type QuizScope,
} from "@/lib/learn/quiz";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SheetState = "correct" | "wrong" | "idle";
type OptionTone = "idle" | "selected" | "correct" | "wrong" | "muted";

interface QuizRunnerProps {
  scope: QuizScope;
  unitIndex: number;
  questions: QuizQuestion[];
  previous: PreviousStudy | null;
  clientSessionId: string;
  onCompleted: (outcome: QuizOutcome) => void;
  onUnauthorized: () => void;
}

export function QuizRunner({
  scope,
  unitIndex,
  questions,
  previous,
  clientSessionId,
  onCompleted,
  onUnauthorized,
}: QuizRunnerProps) {
  const { t } = useLocale();

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [judged, setJudged] = useState<Record<string, boolean>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);

  // 计时从进入答题开始，到成功结算为止
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = questions[index];
  const multiple = isMultipleChoice(current);
  const currentSelected = selected[current.id] ?? [];
  const currentJudged = Boolean(judged[current.id]);
  const currentCorrect = Boolean(correctMap[current.id]);
  const answeredCount = questions.filter((question) => judged[question.id]).length;
  const percent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const judge = (keys: string[]) => {
    const isCorrect = isAnswerCorrect(current, keys);
    setSelected((prev) => ({ ...prev, [current.id]: keys }));
    setJudged((prev) => ({ ...prev, [current.id]: true }));
    setCorrectMap((prev) => ({ ...prev, [current.id]: isCorrect }));
  };

  const handleOptionClick = (optionKey: string) => {
    if (currentJudged || submitting || completedRef.current) return;

    // 多选：切换选中，等用户确认后统一判分；其余题型选中即判
    if (multiple) {
      setSelected((prev) => {
        const keys = prev[current.id] ?? [];
        return {
          ...prev,
          [current.id]: keys.includes(optionKey)
            ? keys.filter((key) => key !== optionKey)
            : [...keys, optionKey],
        };
      });
      return;
    }

    judge([optionKey]);
  };

  const handleConfirm = () => {
    if (currentJudged || submitting || currentSelected.length === 0) return;
    judge(currentSelected);
  };

  const handleSubmit = async () => {
    if (submitting || completedRef.current) return;

    // 与移动端一致：只上报已判分的题目，未作答不计入对错
    const answers: AnswerPayload[] = [];
    const records: QuizOutcome["records"] = {};
    let correctCount = 0;

    for (const question of questions) {
      if (!judged[question.id]) continue;
      const keys = selected[question.id] ?? [];
      const isCorrect = Boolean(correctMap[question.id]);
      answers.push({ questionId: question.id, selectedKeys: keys, isCorrect });
      records[question.id] = { selectedKeys: keys, isCorrect };
      if (isCorrect) correctCount += 1;
    }

    const durationSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);

    setSubmitting(true);
    setSubmitError(false);
    try {
      await finishStudy({
        scope,
        unitIndex,
        correctCount,
        wrongCount: answers.length - correctCount,
        durationSeconds,
        answers,
        clientSessionId,
      });
      completedRef.current = true;
      // 会话已结算：清掉稳定标识，下次进入该单元视为新的作答会话
      try {
        window.sessionStorage.removeItem(quizSessionKey(scope, unitIndex));
      } catch {
        // 隐私模式下 sessionStorage 不可用，不影响结算
      }
      onCompleted({
        correctCount,
        wrongCount: answers.length - correctCount,
        answeredCount: answers.length,
        totalQuestions: questions.length,
        durationSeconds,
        records,
      });
    } catch (error) {
      if (error instanceof AppApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const optionTone = (option: QuizOption): OptionTone => {
    if (!currentJudged) {
      return currentSelected.includes(option.optionKey) ? "selected" : "idle";
    }
    if (option.isCorrect) return "correct";
    if (currentSelected.includes(option.optionKey)) return "wrong";
    return "muted";
  };

  const sheetState = (question: QuizQuestion): SheetState => {
    if (!judged[question.id]) return "idle";
    return correctMap[question.id] ? "correct" : "wrong";
  };

  const sheetClass = (question: QuizQuestion, position: number) => {
    const state = sheetState(question);
    return cn(
      "flex items-center justify-center rounded-md border text-[11px] font-bold transition-colors",
      state === "correct" && "border-primary bg-primary-light text-primary-strong",
      state === "wrong" && "border-destructive/40 bg-destructive/5 text-destructive",
      state === "idle" &&
        "border-border bg-surface-secondary text-foreground-tertiary hover:border-primary/40",
      position === index && "ring-2 ring-primary/40 ring-offset-1 ring-offset-surface",
    );
  };

  const optionClass = (tone: OptionTone) =>
    cn(
      "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
      tone === "idle" &&
        "border-border bg-surface hover:border-primary/40 hover:bg-primary-light/40",
      tone === "selected" && "border-primary bg-primary-light",
      tone === "correct" && "border-primary bg-primary-light",
      tone === "wrong" && "border-destructive/50 bg-destructive/5",
      tone === "muted" && "border-border-light bg-surface-secondary/60 opacity-70",
    );

  const badgeClass = (tone: OptionTone) =>
    cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[11px] font-extrabold",
      tone === "idle" || tone === "muted"
        ? "bg-surface-secondary text-foreground-secondary"
        : tone === "selected" || tone === "correct"
          ? "bg-primary text-primary-foreground"
          : "bg-destructive text-destructive-foreground",
    );

  return (
    <div className="pb-6 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-foreground-tertiary">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1 font-semibold text-foreground-secondary transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("quiz.backToCatalog")}
          </Link>
          <span>·</span>
          <span className="truncate">{t("quiz.unitTitle", { n: unitIndex + 1 })}</span>
          <span>·</span>
          <span className="whitespace-nowrap">
            {t("quiz.questionsCount", { n: questions.length })}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground-secondary">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(elapsed)}
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || answeredCount === 0}
          >
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {submitting ? t("quiz.submitting") : t("quiz.submit")}
          </Button>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {submitError && (
        <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {t("quiz.submitError")}
        </p>
      )}

      {previous && (
        <p className="mt-2 rounded-md border border-border-light bg-surface-secondary px-3 py-2 text-[11px] text-foreground-secondary">
          {t("quiz.previousSummary", {
            correct: previous.correctCount,
            total: previous.totalQuestions,
            duration: formatDuration(previous.durationSeconds),
          })}
        </p>
      )}

      {/* 窄屏：答题卡常驻在导航栏下方，横向滚动跳题 */}
      <div className="sticky top-14 z-30 mt-3 flex gap-2 overflow-x-auto rounded-lg border border-border bg-surface/95 p-2 card-shadow backdrop-blur lg:hidden">
        {questions.map((question, position) => (
          <button
            key={question.id}
            type="button"
            aria-label={`${t("quiz.answerSheet")} ${position + 1}`}
            aria-current={position === index}
            onClick={() => setIndex(position)}
            className={cn("h-8 w-8 shrink-0", sheetClass(question, position))}
          >
            {position + 1}
          </button>
        ))}
      </div>

      <div className="mt-3 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-lg border border-border bg-surface p-4 card-shadow sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold tabular-nums text-foreground-tertiary">
              {index + 1} / {questions.length}
            </span>
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-strong">
              {multiple ? t("quiz.multipleChoice") : t("quiz.singleChoice")}
            </span>
          </div>

          <RichText html={current.content} className="mt-2 text-[15px] leading-7" />

          <div className="mt-4 space-y-2">
            {current.options.map((option) => {
              const tone = optionTone(option);
              const missed =
                currentJudged &&
                multiple &&
                option.isCorrect &&
                !currentSelected.includes(option.optionKey);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionClick(option.optionKey)}
                  disabled={currentJudged || submitting}
                  className={optionClass(tone)}
                >
                  <span className={badgeClass(tone)}>{option.optionKey}</span>
                  <RichText
                    html={option.content}
                    className="min-w-0 flex-1 text-sm [&_p]:my-0 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                  />
                  <span className="flex shrink-0 items-center gap-1.5">
                    {missed && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                        {t("quiz.missed")}
                      </span>
                    )}
                    {tone === "correct" && (
                      <Check className="h-4 w-4 text-primary-strong" />
                    )}
                    {tone === "wrong" && <X className="h-4 w-4 text-destructive" />}
                  </span>
                </button>
              );
            })}
          </div>

          {multiple && !currentJudged && (
            <Button
              className="mt-4 w-full sm:w-auto"
              onClick={handleConfirm}
              disabled={currentSelected.length === 0 || submitting}
            >
              {t("quiz.confirmAnswer")}
            </Button>
          )}

          {currentJudged && (
            <div
              className={cn(
                "mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2 text-sm font-bold",
                currentCorrect
                  ? "bg-primary-light text-primary-strong"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {currentCorrect ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span>{currentCorrect ? t("quiz.correct") : t("quiz.wrong")}</span>
              {!currentCorrect && (
                <span className="text-xs font-semibold opacity-90">
                  {t("quiz.correctAnswer")}: {correctKeys(current).join(" / ")}
                </span>
              )}
            </div>
          )}

          {currentJudged && current.analysis && (
            <div className="mt-3 rounded-md border border-border-light bg-surface-secondary p-3.5">
              <p className="text-[11px] font-bold text-foreground-tertiary">
                {t("quiz.analysis")}
              </p>
              <RichText html={current.analysis} className="mt-1 text-sm leading-6" />
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-light pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
              {t("quiz.prev")}
            </Button>
            <span className="text-xs tabular-nums text-foreground-tertiary">
              {t("quiz.answered", { answered: answeredCount, total: questions.length })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setIndex((value) => Math.min(questions.length - 1, value + 1))
              }
              disabled={index === questions.length - 1}
            >
              {t("quiz.next")}
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </section>

        <aside className="hidden rounded-lg border border-border bg-surface p-4 card-shadow lg:sticky lg:top-20 lg:block">
          <h2 className="text-sm font-bold">{t("quiz.answerSheet")}</h2>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {questions.map((question, position) => (
              <button
                key={question.id}
                type="button"
                aria-label={`${t("quiz.answerSheet")} ${position + 1}`}
                aria-current={position === index}
                onClick={() => setIndex(position)}
                className={cn("h-9", sheetClass(question, position))}
              >
                {position + 1}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-foreground-tertiary">
            <span className="inline-flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-sm border border-primary bg-primary-light" />
              {t("quiz.legendAnswered")}
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-sm border border-border bg-surface-secondary" />
              {t("quiz.legendUnanswered")}
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-sm ring-2 ring-primary/40" />
              {t("quiz.legendCurrent")}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
