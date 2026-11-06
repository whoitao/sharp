"use client";

import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchCatalog,
  fetchGrades,
  fetchSubjects,
  findTextbook,
  flattenTextbooks,
  selectTextbook,
  type CatalogResponse,
  type GradeDto,
  type SubjectDto,
  type TextbookDto,
} from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Check,
  Earth,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Loader2,
  Magnet,
  RefreshCw,
  Scale,
  Shapes,
  SlidersHorizontal,
  Sprout,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Status = "loading" | "error" | "ready";

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

interface GradeOption {
  id: string;
  name: string;
}

interface GradeGroup {
  stageId: string;
  stageName: string;
  grades: GradeOption[];
}

interface SubjectOption {
  id: string;
  name: string;
}

/** 参考稿样式的筛选胶囊：大点击区 + 选中时主色描边/浅底/深色文字 */
function FilterChip({
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
        "flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border px-2 text-sm font-semibold transition-colors sm:px-4",
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

function ActiveFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary-light py-1 pl-2.5 pr-1 text-xs font-semibold text-primary-strong">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-primary/15"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * 筛选面板：贴合参考稿的弹层形态。
 * 手机端整屏、桌面端居中卡片；选中即时生效，「查看 N 本教材」只负责关闭。
 */
function FilterPanel({
  open,
  onClose,
  gradeGroups,
  subjects,
  gradeId,
  subjectId,
  onGrade,
  onSubject,
  onReset,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  gradeGroups: GradeGroup[];
  subjects: SubjectOption[];
  gradeId: string | null;
  subjectId: string | null;
  onGrade: (id: string | null) => void;
  onSubject: (id: string | null) => void;
  onReset: () => void;
  resultCount: number;
}) {
  const { t } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="textbook-filter-title"
        className="flex h-full max-h-[100dvh] w-full flex-col bg-surface sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-border sm:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-light px-5 py-4">
          <h2 id="textbook-filter-title" className="text-lg font-bold">
            {t("learn.filtersTitle")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("learn.closeFilter")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-base font-bold">{t("learn.filterGradeSection")}</h3>
            <div className="mt-3 space-y-2.5">
              {gradeGroups.map((group) => (
                <div key={group.stageId} className="flex items-start gap-3">
                  <span className="w-11 shrink-0 pt-2.5 text-sm text-foreground-tertiary">
                    {group.stageName}
                  </span>
                  <div className="grid flex-1 grid-cols-3 gap-2">
                    {group.grades.map((grade) => (
                      <FilterChip
                        key={grade.id}
                        active={gradeId === grade.id}
                        onClick={() => onGrade(gradeId === grade.id ? null : grade.id)}
                      >
                        {grade.name}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-base font-bold">{t("learn.filterSubjectSection")}</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {subjects.map((subject) => {
                const Icon = SUBJECT_ICONS[subject.name] ?? BookOpen;
                return (
                  <FilterChip
                    key={subject.id}
                    active={subjectId === subject.id}
                    onClick={() => onSubject(subjectId === subject.id ? null : subject.id)}
                    className="min-w-0 px-2"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{subject.name}</span>
                  </FilterChip>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-light px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            disabled={!gradeId && !subjectId}
            className="text-sm font-semibold text-foreground-secondary transition-colors hover:text-foreground disabled:opacity-40"
          >
            {t("learn.resetFilters")}
          </button>
          <Button onClick={onClose} className="min-w-[9.5rem]">
            {t("learn.showResults", { n: resultCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 教材目录：筛选弹层 + 当前教材 + 竖版封面卡片，选中后交由父级打开章节视图 */
export function TextbookPicker({ onOpen }: { onOpen: (textbook: TextbookDto) => void }) {
  const { t } = useLocale();

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [gradeOptions, setGradeOptions] = useState<GradeDto[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectDto[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState(false);

  const [gradeId, setGradeId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    // 目录与年级/科目字典并行取：字典是全量的，目录只含已有教材的年级与科目
    Promise.all([fetchCatalog(), fetchGrades(), fetchSubjects()])
      .then(([data, grades, subjectList]) => {
        if (!alive) return;
        setCatalog(data);
        setGradeOptions(grades);
        setSubjectOptions(subjectList);
        setSelectedId(data.selectedTextbookId ?? null);
        setGradeId(null);
        setSubjectId(null);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const allTextbooks = useMemo(
    () => (catalog ? catalog.stages.flatMap((stage) => flattenTextbooks(stage)) : []),
    [catalog],
  );

  // 年级用全量字典分组：学段顺序、年级顺序都取自 sortOrder，缺教材的年级也保留
  const gradeGroups = useMemo<GradeGroup[]>(() => {
    const groups = new Map<string, GradeGroup>();
    for (const grade of gradeOptions) {
      const group = groups.get(grade.stageId);
      const option = { id: grade.id, name: grade.name };
      if (group) {
        group.grades.push(option);
      } else {
        groups.set(grade.stageId, {
          stageId: grade.stageId,
          stageName: grade.stage,
          grades: [option],
        });
      }
    }
    return [...groups.values()];
  }, [gradeOptions]);

  // 科目同样用全量字典，顺序取自 sortOrder
  const subjects = useMemo<SubjectOption[]>(
    () => subjectOptions.map((subject) => ({ id: subject.id, name: subject.name })),
    [subjectOptions],
  );

  const filtered = useMemo(
    () =>
      allTextbooks.filter(
        (textbook) =>
          (!gradeId || textbook.gradeId === gradeId) &&
          (!subjectId || textbook.subjectId === subjectId),
      ),
    [allTextbooks, gradeId, subjectId],
  );

  const current = findTextbook(catalog, selectedId);
  const totalTextbooks = allTextbooks.length;
  const activeFilterCount = (gradeId ? 1 : 0) + (subjectId ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  const gradeName = useMemo(() => {
    if (!gradeId) return null;
    for (const group of gradeGroups) {
      const hit = group.grades.find((grade) => grade.id === gradeId);
      if (hit) return hit.name;
    }
    return null;
  }, [gradeGroups, gradeId]);

  const subjectName = useMemo(
    () => subjects.find((subject) => subject.id === subjectId)?.name ?? null,
    [subjects, subjectId],
  );

  const closeFilters = useCallback(() => setFilterOpen(false), []);

  function clearFilters() {
    setGradeId(null);
    setSubjectId(null);
  }

  async function handlePick(textbook: TextbookDto) {
    if (savingId) return;
    setSelectError(false);
    if (selectedId !== textbook.id) {
      setSavingId(textbook.id);
      try {
        // 只提交 textbookId，年级/科目/出版社由服务端反推
        await selectTextbook(textbook.id);
        setSelectedId(textbook.id);
      } catch {
        setSelectError(true);
        setSavingId(null);
        return;
      }
      setSavingId(null);
    }
    onOpen(textbook);
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("learn.title")}</h1>
        {status === "ready" && totalTextbooks > 0 && (
          <Button
            variant="outline"
            className="w-full justify-center sm:w-auto sm:shrink-0"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            {t("learn.filters")}
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </header>

      {selectError && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t("learn.selectError")}
        </p>
      )}

      {status === "ready" && hasFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground-tertiary">
            {t("learn.activeFilters")}
          </span>
          {gradeName && <ActiveFilterChip label={gradeName} onClear={() => setGradeId(null)} />}
          {subjectName && (
            <ActiveFilterChip label={subjectName} onClear={() => setSubjectId(null)} />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-primary-strong hover:underline"
          >
            {t("learn.clearFilters")}
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="mt-6 space-y-4">
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-[136px] animate-pulse rounded-lg border border-border bg-surface"
              />
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 card-shadow">
          <p className="font-bold">{t("learn.loadErrorTitle")}</p>
          <p className="text-sm text-foreground-secondary">{t("learn.loadErrorBody")}</p>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t("learn.retry")}
          </Button>
        </div>
      )}

      {status === "ready" && totalTextbooks === 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-8 text-center card-shadow">
          <p className="font-bold">{t("learn.emptyCatalogTitle")}</p>
          <p className="mt-1.5 text-sm text-foreground-secondary">
            {t("learn.emptyCatalogBody")}
          </p>
        </div>
      )}

      {status === "ready" && totalTextbooks > 0 && (
        <>
          {current && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg border border-primary/30 bg-gradient-to-br from-primary-light to-surface p-4 card-shadow sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <TextbookCover textbook={current} size="sm" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-primary-strong">
                    {t("learn.currentLabel")}
                  </p>
                  <p className="mt-0.5 truncate text-base font-bold">{current.name}</p>
                  <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                    {current.publisherName} · {current.gradeName} · {current.semesterLabel} ·{" "}
                    {t("learn.chaptersCount", { n: current.chapterCount })} ·{" "}
                    {t("learn.questionsCount", { n: current.questionCount })}
                  </p>
                </div>
              </div>
              <Button className="w-full shrink-0 sm:w-auto" onClick={() => onOpen(current)}>
                {t("learn.openChapters")}
              </Button>
            </div>
          )}

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold">
              {t("learn.allTextbooks")}
              <span className="ml-2 text-xs font-semibold text-foreground-tertiary">
                {t("learn.count", { n: filtered.length })}
              </span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-3 rounded-lg border border-border bg-surface p-8 text-center card-shadow">
              <p className="font-bold">{t("learn.emptyFilterTitle")}</p>
              <p className="mt-1.5 text-sm text-foreground-secondary">
                {t("learn.emptyFilterBody")}
              </p>
              {hasFilters && (
                <Button size="sm" variant="outline" className="mt-4" onClick={clearFilters}>
                  {t("learn.clearFilters")}
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((textbook) => {
                const selected = textbook.id === selectedId;
                const saving = savingId === textbook.id;
                return (
                  <button
                    key={textbook.id}
                    type="button"
                    onClick={() => handlePick(textbook)}
                    aria-pressed={selected}
                    aria-busy={saving}
                    className={cn(
                      "relative flex gap-3 rounded-lg border bg-surface p-3 text-left card-shadow transition",
                      selected
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border hover:-translate-y-0.5 hover:border-primary/35",
                      saving && "opacity-70",
                    )}
                  >
                    <div className="w-[78px] shrink-0 sm:w-[84px] xl:w-[88px]">
                      <TextbookCover textbook={textbook} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="line-clamp-2 pr-7 text-[13px] font-bold leading-snug">
                        {textbook.name}
                      </h3>
                      <p className="mt-1 truncate text-[11px] text-foreground-tertiary">
                        {textbook.publisherName} · {textbook.gradeName} ·{" "}
                        {textbook.semesterLabel}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-light pt-2 text-[11px] text-foreground-secondary">
                        <span className="truncate">
                          {t("learn.chaptersCount", { n: textbook.chapterCount })}
                        </span>
                        <span className="shrink-0 font-semibold text-primary-strong">
                          {t("learn.questionsCount", { n: textbook.questionCount })}
                        </span>
                      </div>
                    </div>
                    {(selected || saving) && (
                      <span className="absolute right-3 top-3 z-[2] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <FilterPanel
        open={filterOpen}
        onClose={closeFilters}
        gradeGroups={gradeGroups}
        subjects={subjects}
        gradeId={gradeId}
        subjectId={subjectId}
        onGrade={setGradeId}
        onSubject={setSubjectId}
        onReset={clearFilters}
        resultCount={filtered.length}
      />
    </div>
  );
}
