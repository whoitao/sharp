"use client";

import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fetchCatalog, type CatalogResponse, type TextbookDto } from "@/lib/learn/api";
import { useStudyScope } from "@/lib/study-scope";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Earth,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Loader2,
  Magnet,
  Scale,
  Shapes,
  Sprout,
  X,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  语文: Languages,
  数学: Shapes,
  英语: Globe,
  物理: Magnet,
  化学: FlaskConical,
  生物: Sprout,
  地理: Earth,
  历史: Landmark,
  道法: Scale,
};

export interface GradeGroup {
  stageId: string;
  stageName: string;
  grades: { id: string; name: string }[];
}

export interface SubjectOption {
  id: string;
  name: string;
}

type Step = 1 | 2 | 3;
type CatalogStatus = "loading" | "error" | "ready";

/**
 * 选择胶囊：按内容自适应宽度（不铺满整行），选中时主色描边 + 浅底。
 * 尺寸全部走 rem，随「展示效果」三档根字号缩放。
 */
function ChoiceChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors sm:px-3.5",
        active
          ? "border-primary bg-primary-light text-primary-strong"
          : "border-transparent bg-surface-secondary text-foreground hover:border-border hover:text-primary-strong",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * 全局学习范围弹层：按「学段 → 科目 → 教材」三步走，选中即时保存。
 * 第 1 步选年级视为选定学段并自动进入第 2 步；第 2 步选科目自动进入第 3 步；
 * 第 3 步选定教材即生效并关闭。顶部步骤条与「上一步」都可以回退。
 * 移动端整屏、桌面端居中卡片，与页面内其它弹层保持同一形态。
 */
export function ScopeDialog({
  open,
  onClose,
  gradeGroups,
  subjects,
  gradeId,
  subjectId,
  onGrade,
  onSubject,
  onTextbook,
  saveFailed,
}: {
  open: boolean;
  onClose: () => void;
  gradeGroups: GradeGroup[];
  subjects: SubjectOption[];
  gradeId: string | null;
  subjectId: string | null;
  onGrade: (id: string | null) => void;
  onSubject: (id: string | null) => void;
  /** 选中教材：由外层负责提交并同步全局范围，失败时抛错 */
  onTextbook: (textbook: TextbookDto) => Promise<void>;
  saving?: boolean;
  saveFailed?: boolean;
}) {
  const { t } = useLocale();
  // 当前教材取自全局 scope，与导航栏胶囊、/learn 共用同一份数据
  const { textbook: globalTextbook } = useStudyScope();
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const [step, setStep] = useState<Step>(1);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [savingTextbookId, setSavingTextbookId] = useState<string | null>(null);
  const [textbookFailed, setTextbookFailed] = useState(false);

  const currentGrade = useMemo(
    () => gradeGroups.flatMap((group) => group.grades).find((grade) => grade.id === gradeId) ?? null,
    [gradeGroups, gradeId],
  );
  const currentSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjects, subjectId],
  );

  const allTextbooks = useMemo(
    () =>
      catalog
        ? catalog.stages.flatMap((stage) =>
            stage.subjects.flatMap((subject) => subject.textbooks),
          )
        : [],
    [catalog],
  );
  const textbooks = useMemo(
    () =>
      allTextbooks.filter(
        (textbook) => textbook.gradeId === gradeId && textbook.subjectId === subjectId,
      ),
    [allTextbooks, gradeId, subjectId],
  );
  const selectedTextbookName = globalTextbook?.name ?? null;

  const activeGroup =
    gradeGroups.find((group) => group.stageId === activeStageId) ?? gradeGroups[0] ?? null;

  // 分组标题带出当前已选值，避免用户看不出选中了哪个学段/年级
  const stageTitle = activeGroup
    ? t("scope.titleWithValue", { label: t("scope.chooseStage"), value: activeGroup.stageName })
    : t("scope.chooseStage");
  const gradeTitle = currentGrade
    ? t("scope.titleWithValue", { label: t("scope.chooseGrade"), value: currentGrade.name })
    : t("scope.chooseGrade");

  // 每次打开都回到第 1 步，并把学段定位到当前年级所属学段
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setStep(1);
    setSavingTextbookId(null);
    setTextbookFailed(false);
    const stage =
      gradeGroups.find((group) => group.grades.some((grade) => grade.id === gradeId))
        ?.stageId ??
      gradeGroups[0]?.stageId ??
      null;
    setActiveStageId(stage);
  }, [open, gradeGroups, gradeId]);

  // 教材目录在打开弹窗时拉取一次，三步内切换年级/科目只在本地过滤
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCatalogStatus("loading");
    fetchCatalog()
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (alive) setCatalogStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [open, catalogReloadKey]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const stepMetas: { step: Step; label: string; value: string | null }[] = [
    { step: 1, label: t("scope.stepStage"), value: currentGrade?.name ?? null },
    { step: 2, label: t("scope.stepSubject"), value: currentSubject?.name ?? null },
    { step: 3, label: t("scope.stepTextbook"), value: selectedTextbookName },
  ];
  const canGoStep2 = Boolean(currentGrade);
  const canGoStep3 = Boolean(currentGrade && currentSubject);

  function isReachable(target: Step) {
    if (target === 1) return true;
    if (target === 2) return canGoStep2;
    return canGoStep3;
  }

  function pickGrade(id: string) {
    if (gradeId !== id) onGrade(id);
    setStep(2);
  }

  function pickSubject(id: string) {
    if (subjectId !== id) onSubject(id);
    setStep(3);
  }

  async function pickTextbook(textbook: TextbookDto) {
    if (savingTextbookId) return;
    setTextbookFailed(false);
    if (textbook.id === globalTextbook?.id) {
      onClose();
      return;
    }
    setSavingTextbookId(textbook.id);
    try {
      await onTextbook(textbook);
      onClose();
    } catch {
      setTextbookFailed(true);
    } finally {
      setSavingTextbookId(null);
    }
  }

  const showDoneButton =
    step === 3 &&
    (catalogStatus === "error" || (catalogStatus === "ready" && textbooks.length === 0));

  // 导航栏有 backdrop-blur，会成为 fixed 子元素的包含块；挂到 body 才能覆盖整屏
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-scope-title"
        tabIndex={-1}
        className="relative flex h-full max-h-[100dvh] w-full flex-col bg-surface outline-none sm:h-auto sm:max-h-[85vh] sm:w-[36rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:border-border sm:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="study-scope-title" className="sr-only">
          {t("scope.title")}
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("scope.close")}
          className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex items-stretch gap-0.5 px-5 pr-11 pt-3 sm:px-6 sm:pr-12">
          {stepMetas.map((meta, index) => {
            const active = step === meta.step;
            const reachable = isReachable(meta.step);
            return (
              <Fragment key={meta.step}>
                {index > 0 && (
                  <span className="flex shrink-0 items-center text-foreground-tertiary">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setStep(meta.step)}
                  disabled={!reachable}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center transition-colors",
                    active
                      ? "bg-primary-light text-primary-strong"
                      : reachable
                        ? "text-foreground-secondary hover:bg-accent hover:text-primary-strong"
                        : "text-foreground-tertiary opacity-60",
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5 text-xs font-bold leading-none">
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.625rem] leading-none",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-current",
                      )}
                    >
                      {meta.value && !active ? (
                        <Check className="h-2.5 w-2.5" aria-hidden />
                      ) : (
                        meta.step
                      )}
                    </span>
                    <span className="truncate leading-none">{meta.label}</span>
                  </span>
                  <span className="w-full truncate text-[0.6875rem] font-medium leading-tight">
                    {meta.value ?? t("scope.notChosen")}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-6">
          {step === 1 && (
            <section>
              <h3 className="text-sm font-bold text-foreground">{stageTitle}</h3>
              <div className="mt-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {gradeGroups.map((group) => (
                  <ChoiceChip
                    key={group.stageId}
                    active={activeGroup?.stageId === group.stageId}
                    onClick={() => setActiveStageId(group.stageId)}
                  >
                    {group.stageName}
                  </ChoiceChip>
                ))}
              </div>

              <h3 className="mt-5 text-sm font-bold text-foreground">
                {gradeTitle}
              </h3>
              <div className="mt-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeGroup?.grades.length ? (
                  activeGroup.grades.map((grade) => (
                    <ChoiceChip
                      key={grade.id}
                      active={gradeId === grade.id}
                      onClick={() => pickGrade(grade.id)}
                    >
                      {grade.name}
                    </ChoiceChip>
                  ))
                ) : (
                  <p className="text-xs text-foreground-tertiary">{t("scope.emptyGrades")}</p>
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              {currentGrade && (
                <p className="text-xs text-foreground-secondary">
                  {t("scope.currentGrade", { name: currentGrade.name })}
                </p>
              )}
              <h3 className="mt-3 text-sm font-bold text-foreground">
                {t("scope.chooseSubject")}
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {subjects.map((subject) => {
                  const Icon = SUBJECT_ICONS[subject.name] ?? BookOpen;
                  return (
                    <ChoiceChip
                      key={subject.id}
                      active={subjectId === subject.id}
                      onClick={() => pickSubject(subject.id)}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{subject.name}</span>
                    </ChoiceChip>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {t("scope.chooseTextbook")}
                </h3>
                {catalogStatus === "ready" && textbooks.length > 0 && (
                  <span className="text-xs font-semibold text-foreground-tertiary">
                    {t("learn.count", { n: textbooks.length })}
                  </span>
                )}
              </div>

              {currentGrade && currentSubject && (
                <p className="mt-1 text-xs text-foreground-secondary">
                  {currentGrade.name} · {currentSubject.name}
                </p>
              )}

              {catalogStatus === "loading" && (
                <div className="mt-3 space-y-2">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-[76px] animate-pulse rounded-lg border border-border bg-surface"
                    />
                  ))}
                </div>
              )}

              {catalogStatus === "error" && (
                <div className="mt-3 rounded-lg border border-border bg-surface p-5 text-center card-shadow">
                  <p className="text-sm font-bold">{t("learn.loadErrorTitle")}</p>
                  <p className="mt-1 text-xs text-foreground-secondary">
                    {t("scope.textbookLoadError")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCatalogReloadKey((key) => key + 1)}
                  >
                    {t("learn.retry")}
                  </Button>
                </div>
              )}

              {catalogStatus === "ready" && textbooks.length === 0 && (
                <div className="mt-3 rounded-lg border border-border bg-surface p-5 text-center card-shadow">
                  <p className="text-sm font-bold">{t("scope.emptyTextbooksTitle")}</p>
                  <p className="mt-1 text-xs text-foreground-secondary">
                    {t("scope.emptyTextbooksBody")}
                  </p>
                </div>
              )}

              {catalogStatus === "ready" && textbooks.length > 0 && (
                <>
                  {textbookFailed && (
                    <p role="alert" className="mt-3 text-xs text-destructive">
                      {t("scope.selectTextbookError")}
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    {textbooks.map((textbook) => {
                      const selected = textbook.id === globalTextbook?.id;
                      const saving = savingTextbookId === textbook.id;
                      return (
                        <button
                          key={textbook.id}
                          type="button"
                          onClick={() => pickTextbook(textbook)}
                          aria-pressed={selected}
                          aria-busy={saving}
                          className={cn(
                            "relative flex w-full items-start gap-3 rounded-lg border bg-surface p-2.5 text-left transition",
                            selected
                              ? "border-primary ring-2 ring-primary/15"
                              : "border-border hover:border-primary/35",
                            saving && "opacity-70",
                          )}
                        >
                          <TextbookCover textbook={textbook} size="sm" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <p
                              className="truncate pr-7 text-sm font-bold leading-snug"
                              title={textbook.name}
                            >
                              {textbook.publisherName} · {textbook.semesterLabel}
                            </p>
                            <p className="mt-1 truncate text-xs text-foreground-secondary">
                              {t("learn.chaptersCount", { n: textbook.chapterCount })} ·{" "}
                              {t("learn.questionsCount", { n: textbook.questionCount })}
                            </p>
                          </div>
                          {(selected || saving) && (
                            <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                              {saving ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              ) : (
                                <Check className="h-3 w-3" aria-hidden />
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {(step > 1 || saveFailed) && (
          <div className="flex items-center justify-between gap-3 border-t border-border-light px-5 py-3 sm:px-6">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((current) => (current > 1 ? ((current - 1) as Step) : current))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {t("scope.back")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {saveFailed && (
                <p role="alert" className="text-xs text-destructive">
                  {t("account.saveFailed")}
                </p>
              )}
              {showDoneButton && (
                <Button size="sm" onClick={onClose}>
                  {t("scope.done")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
