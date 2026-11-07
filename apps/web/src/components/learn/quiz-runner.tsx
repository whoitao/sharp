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
  Circle,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SheetState = "correct" | "wrong" | "idle";
type OptionTone = "idle" | "selected" | "correct" | "wrong" | "muted";

interface QuizRunnerProps {
  scope: QuizScope;
  unitIndex: number;
  questions: QuizQuestion[];
  previous: PreviousStudy | null;
  clientSessionId: string;
  /** 知识点模式的入口会带上知识点名称：头部先展示知识点，再展示单元 */
  knowledgePointName?: string | null;
  /** 章节模式的入口会带上章节名称：头部先展示章节，再展示单元 */
  chapterName?: string | null;
  onCompleted: (outcome: QuizOutcome) => void;
  onUnauthorized: () => void;
}

export function QuizRunner({
  scope,
  unitIndex,
  questions,
  previous,
  clientSessionId,
  knowledgePointName = null,
  chapterName = null,
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
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // 吸顶页头高度会随标题换行/密度变化：量出来再让侧栏从页头下沿开始吸顶
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => setHeaderHeight(el.offsetHeight);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
  const correctAnswered = questions.filter((question) => correctMap[question.id]).length;
  const wrongAnswered = answeredCount - correctAnswered;
  const unansweredCount = questions.length - answeredCount;
  const percent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const typeLabel =
    current.type === 3
      ? t("quiz.judgement")
      : multiple
        ? t("quiz.multipleChoice")
        : t("quiz.singleChoice");

  // 头部标题上方的上下文：按知识点学显示知识点名，按章节学显示章节名
  const contextName = knowledgePointName ?? chapterName;

  // 本题考点：优先用题目自带的关联知识点；接口未返回时退回入口知识点，
  // 保证从「按知识点学」进入的答题页也能看到考点。
  const pointNames = current.knowledgePoints?.length
    ? current.knowledgePoints.map((point) => point.name)
    : knowledgePointName
      ? [knowledgePointName]
      : [];

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
      "flex aspect-square w-full items-center justify-center rounded-sm border text-xs font-bold transition-colors",
      state === "correct" &&
        "border-primary/30 bg-primary-light text-primary-strong",
      state === "wrong" &&
        "border-destructive/30 bg-destructive/10 text-destructive",
      state === "idle" &&
        "border-border bg-surface text-foreground-tertiary hover:border-primary/40",
      position === index &&
        (state === "wrong"
          ? "border-destructive ring-2 ring-destructive/20"
          : "border-primary ring-2 ring-primary/20"),
    );
  };

  const optionClass = (tone: OptionTone) =>
    cn(
      "flex w-full items-center gap-3 rounded-sm border px-3.5 py-3 text-left transition-colors",
      tone === "idle" &&
        "border-border bg-surface hover:border-primary/45 hover:bg-surface-secondary",
      tone === "selected" && "border-primary bg-primary-light",
      tone === "correct" && "border-primary bg-primary-light",
      tone === "wrong" && "border-destructive bg-destructive/10",
      tone === "muted" && "border-border-light bg-surface-secondary/60 opacity-80",
    );

  const badgeClass = (tone: OptionTone) =>
    cn(
      "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-sm border text-xs font-bold",
      tone === "idle" || tone === "muted"
        ? "border-border bg-surface text-foreground-secondary"
        : tone === "selected" || tone === "correct"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-destructive bg-destructive text-destructive-foreground",
    );

  return (
    <div className="pb-6 md:pb-8">
      {/* 吸顶：标题 + 进度 + 翻页（z-index 低于 navbar 的 z-50） */}
      <div
        ref={headerRef}
        className="sticky top-14 z-30 -mx-4 mb-4 bg-background/95 px-4 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        {/* 顶部：单元信息 + 题型/计时/结算 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0">
            {/* 章节名/知识点名与单元同行展示，如「列强侵略与民族危机：第 1 单元」 */}
            <h1 className="text-xl font-bold leading-tight tracking-[-0.035em]">
              {contextName
                ? `${contextName}：${t("quiz.unitTitle", { n: unitIndex + 1 })}`
                : t("quiz.unitTitle", { n: unitIndex + 1 })}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-strong">
              {typeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold tabular-nums text-foreground-secondary">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(elapsed)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-sm hover:bg-surface-secondary hover:text-foreground"
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
            >
              {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {submitting ? t("quiz.submitting") : t("quiz.endRound")}
            </Button>
          </div>
        </div>

        {/* 进度 + 翻页：翻页固定在页头，不随解析长短移动 */}
        <div className="mt-[0.45rem]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs text-foreground-tertiary">
            <span className="flex items-center gap-2">
              <span>
                {t("quiz.stepOf", { current: index + 1, total: questions.length })}
              </span>
              <span aria-hidden className="text-foreground-tertiary/40">
                ·
              </span>
              <span>
                {t("quiz.answered", {
                  answered: answeredCount,
                  total: questions.length,
                })}
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-sm px-2 hover:bg-surface-secondary hover:text-foreground"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                disabled={index === 0}
                aria-label={t("quiz.prev")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="ml-0.5 hidden sm:inline">{t("quiz.prev")}</span>
              </Button>
              <Button
                size="sm"
                className="h-7 rounded-sm px-2.5"
                onClick={() =>
                  setIndex((value) => Math.min(questions.length - 1, value + 1))
                }
                disabled={index === questions.length - 1}
              >
                {t("quiz.next")}
                <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border-light">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {submitError && (
        <p className="mb-3 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {t("quiz.submitError")}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_286px]">
        <section className="min-w-0 rounded-xl border border-border bg-surface px-5 py-5 card-shadow sm:px-7 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-foreground-tertiary">
              Question{" "}
              <b className="text-base font-bold tracking-normal text-foreground">
                {String(index + 1).padStart(2, "0")}
              </b>
            </div>
            <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-semibold text-foreground-secondary">
              {current.score > 0
                ? t("quiz.scoreType", { score: current.score, type: typeLabel })
                : typeLabel}
            </span>
          </div>

          <RichText
            html={current.content}
            className="quiz-richtext mt-4 text-base leading-[1.85]"
            style={{ fontSize: 15, lineHeight: 1.85 }}
          />

          <div className="mt-5 flex flex-col gap-2">
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
                    className="quiz-richtext min-w-0 flex-1 break-words text-sm [&_p]:my-0"
                    style={{ fontSize: 14, lineHeight: 1.6 }}
                  />
                  <span className="flex shrink-0 items-center gap-1.5">
                    {missed && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[0.625rem] font-semibold text-destructive">
                        {t("quiz.missed")}
                      </span>
                    )}
                    {tone === "correct" && (
                      <Check className="h-[18px] w-[18px] text-primary-strong" />
                    )}
                    {tone === "wrong" && (
                      <X className="h-[18px] w-[18px] text-destructive" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {currentJudged && (
            <div
              className={cn(
                "mt-4 rounded-sm border px-4 py-3.5",
                currentCorrect
                  ? "border-primary/35 bg-primary-light"
                  : "border-destructive/30 bg-destructive/10",
              )}
            >
              <div
                className={cn(
                  "flex flex-wrap items-center gap-1.5 text-sm font-bold",
                  currentCorrect ? "text-primary-strong" : "text-destructive",
                )}
              >
                {currentCorrect ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span>
                  {currentCorrect ? t("quiz.correct") : t("quiz.wrong")}
                </span>
                {currentCorrect && current.score > 0 && (
                  <span>{" · "}{t("quiz.scorePts", { score: current.score })}</span>
                )}
                {!currentCorrect && (
                  <span>
                    {" · "}
                    {t("quiz.correctAnswer")}{" "}
                    {correctKeys(current).join(" / ")}
                  </span>
                )}
              </div>
              {current.analysis && (
                <RichText
                  html={current.analysis}
                  className="quiz-richtext mt-1.5 text-foreground-secondary [&_strong]:text-foreground"
                  style={{ fontSize: 12, lineHeight: 1.75 }}
                />
              )}
            </div>
          )}

          <p className="mt-3 hidden text-xs text-foreground-tertiary sm:block">
            {multiple ? t("quiz.ruleMultiple") : t("quiz.ruleSingle")}
          </p>

          {/* 多选未判分：确认按钮贴近选项；翻页已固定在页头 */}
          {multiple && !currentJudged && (
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                className="rounded-sm"
                onClick={handleConfirm}
                disabled={currentSelected.length === 0 || submitting}
              >
                {t("quiz.confirmAnswer")}
              </Button>
            </div>
          )}
        </section>

        <aside
          className="grid gap-3.5 sm:grid-cols-2 lg:sticky lg:grid-cols-1"
          style={
            headerHeight
              ? { top: `calc(3.5rem + ${headerHeight}px + 1rem)` }
              : undefined
          }
        >
          <div className="rounded-xl border border-border bg-surface p-4 card-shadow sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">{t("quiz.answerSheet")}</h2>
              <span className="text-[0.625rem] text-foreground-tertiary">
                {t("quiz.questionsCount", { n: questions.length })}
              </span>
            </div>
            {/* pad 宽度下答题卡占满整行，每行 10 个；手机 5 个、桌面侧栏 5 个 */}
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
              {questions.map((question, position) => (
                <button
                  key={question.id}
                  type="button"
                  aria-label={`${t("quiz.answerSheet")} ${position + 1}`}
                  aria-current={position === index}
                  onClick={() => setIndex(position)}
                  className={sheetClass(question, position)}
                >
                  {position + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.625rem] text-foreground-tertiary">
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-[7px] w-[7px] rounded-[2px] bg-border" />
                {t("quiz.legendUnanswered")}
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-[7px] w-[7px] rounded-[2px] bg-primary" />
                {t("quiz.legendAnswered")}
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-[7px] w-[7px] rounded-[2px] bg-destructive" />
                {t("quiz.legendWrong")}
              </span>
            </div>
          </div>

          {pointNames.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4 card-shadow">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">
                  {t("quiz.pointTitle")}
                </h2>
                <span className="text-[0.625rem] text-foreground-tertiary">
                  {t("quiz.unitTitle", { n: unitIndex + 1 })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pointNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-strong"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            className="rounded-xl border border-primary/25 p-4 card-shadow"
            style={{
              background:
                "linear-gradient(120deg, hsl(var(--primary-light)), hsl(var(--surface)))",
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">
                {t("quiz.roundProgress")}
              </h2>
              <span className="text-[0.625rem] text-foreground-tertiary">
                {t("quiz.roundLive")}
              </span>
            </div>
            <div className="flex flex-col gap-2 text-xs text-foreground-secondary">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary-strong" />
                  {t("quiz.correctCount")}
                </span>
                <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-primary-strong">
                  {correctAnswered}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <X className="h-3.5 w-3.5 text-destructive" />
                  {t("quiz.wrongCount")}
                </span>
                <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-destructive">
                  {wrongAnswered}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5 text-foreground-tertiary" />
                  {t("quiz.legendUnanswered")}
                </span>
                <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-foreground-secondary">
                  {unansweredCount}
                </span>
              </div>
            </div>
          </div>

          {previous && (
            <div className="rounded-xl border border-border bg-surface p-4 card-shadow">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">
                  {t("quiz.previousTitle")}
                </h2>
              </div>
              <p className="text-xs leading-5 text-foreground-secondary">
                {t("quiz.previousSummary", {
                  correct: previous.correctCount,
                  total: previous.totalQuestions,
                  duration: formatDuration(previous.durationSeconds),
                })}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
