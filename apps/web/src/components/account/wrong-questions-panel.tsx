"use client";

import { RichText } from "@/components/learn/rich-text";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchGrades,
  fetchSubjects,
  fetchWrongQuestions,
  type GradeDto,
  type SubjectDto,
  type WrongQuestionDto,
} from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadStatus = "loading" | "ready" | "error";

/** 折叠态题干：去掉富文本标签，保留可读文字 */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** 错题本：按年级/科目筛选，卡片展开查看选项与解析 */
export function WrongQuestionsPanel() {
  const { t, locale } = useLocale();

  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [items, setItems] = useState<WrongQuestionDto[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    Promise.all([fetchGrades(), fetchSubjects()])
      .then(([gradeList, subjectList]) => {
        if (!alive) return;
        setGrades(gradeList);
        setSubjects(subjectList);
      })
      .catch(() => {
        /* 字典失败不阻塞错题展示 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setStatus("loading");
      try {
        const data = await fetchWrongQuestions({
          page: targetPage,
          pageSize: 20,
          gradeId: gradeId || null,
          subjectId: subjectId || null,
        });
        setItems((prev) => (append ? [...prev, ...data.data] : data.data));
        setPage(data.page);
        setTotalPages(data.totalPages);
        setStatus("ready");
      } catch {
        if (!append) {
          setItems([]);
          setStatus("error");
        }
      } finally {
        setLoadingMore(false);
      }
    },
    [gradeId, subjectId],
  );

  useEffect(() => {
    setExpandedIds({});
    void load(1, false);
  }, [load]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "2-digit",
        day: "2-digit",
      }),
    [locale],
  );

  const toggle = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-w-0 pb-2">
      {/* 年级 / 科目筛选：与移动端全局范围选择器同一批参数 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={gradeId}
          onChange={(event) => setGradeId(event.target.value)}
          aria-label={t("wrong.filterGrade")}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary sm:max-w-[160px]"
        >
          <option value="">{t("wrong.allGrades")}</option>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          aria-label={t("wrong.filterSubject")}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary sm:max-w-[160px]"
        >
          <option value="">{t("wrong.allSubjects")}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-foreground-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("wrong.loading")}
          </div>
        ) : status === "error" ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
            <p className="text-sm font-semibold">{t("wrong.loadErrorTitle")}</p>
            <p className="mt-1 text-xs text-foreground-secondary">
              {t("wrong.loadErrorBody")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void load(1, false)}
            >
              {t("wrong.retryLoad")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
            <PartyPopper className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 text-sm font-semibold">{t("wrong.emptyTitle")}</p>
            <p className="mt-1 text-xs text-foreground-secondary">
              {t("wrong.emptyBody")}
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {items.map((item, index) => {
                const expanded = !!expandedIds[item.questionId];
                const question = item.question;
                const options = [...question.options].sort(
                  (a, b) => a.sortNo - b.sortNo,
                );
                const multiple = question.type === 2;
                return (
                  <li
                    key={item.questionId}
                    className="overflow-hidden rounded-lg border border-border bg-surface card-shadow"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.questionId)}
                      aria-expanded={expanded}
                      className="flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-surface-secondary/60"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold tabular-nums text-destructive">
                        {index + 1}
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-6 text-foreground-secondary">
                        {plainText(question.content)}
                      </span>
                      {expanded ? (
                        <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-foreground-tertiary" />
                      ) : (
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-foreground-tertiary" />
                      )}
                    </button>

                    {expanded && (
                      <div className="border-t border-border-light px-3.5 pb-3.5 pt-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-foreground-tertiary">
                          <span>
                            {t("wrong.wrongCount", { n: item.wrongCount })}
                          </span>
                          {item.lastPracticedAt && (
                            <span>
                              {t("wrong.lastPracticed", {
                                time: dateFormatter.format(
                                  new Date(item.lastPracticedAt),
                                ),
                              })}
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                          {options.map((option) => (
                            <div
                              key={option.id}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg border px-2.5 py-2",
                                option.isCorrect
                                  ? "border-primary bg-primary-light"
                                  : "border-border-light bg-surface-secondary/60",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[0.625rem] font-extrabold",
                                  option.isCorrect
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-surface-secondary text-foreground-tertiary",
                                )}
                              >
                                {option.optionKey}
                              </span>
                              <RichText
                                html={option.content}
                                className={cn(
                                  "min-w-0 flex-1 text-sm [&_p]:my-0",
                                  option.isCorrect && "font-medium",
                                )}
                              />
                              {option.isCorrect && (
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                              )}
                            </div>
                          ))}
                        </div>

                        {question.analysis && (
                          <div className="mt-2.5 rounded-md border-l-[3px] border-primary bg-primary-light px-3 py-2.5">
                            <p className="text-[0.6875rem] font-bold text-primary-strong">
                              {t("wrong.analysis")}
                            </p>
                            <RichText
                              html={question.analysis}
                              className="mt-1 text-sm leading-6"
                            />
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                            <span>{t("wrong.difficulty")}</span>
                            <span className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, star) => (
                                <span
                                  key={star}
                                  className={cn(
                                    "text-sm",
                                    star < question.difficulty
                                      ? "text-primary"
                                      : "text-border",
                                  )}
                                >
                                  ★
                                </span>
                              ))}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-foreground-tertiary">
                            {multiple ? t("wrong.multipleChoice") : t("wrong.singleChoice")}
                          </span>
                        </div>
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
                  onClick={() => void load(page + 1, true)}
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("wrong.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
