"use client";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Earth,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Magnet,
  Scale,
  Shapes,
  Sprout,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
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
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors sm:px-3.5",
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
 * 全局学习范围弹层：年级按学段分组，科目带图标；选中即时保存。
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
  saving?: boolean;
  saveFailed?: boolean;
}) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);

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

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <h3 className="text-sm font-bold text-foreground">
              {t("learn.filterGradeSection")}
            </h3>
            <div className="mt-3 space-y-2">
              {gradeGroups.map((group) => (
                <div key={group.stageId} className="flex items-start gap-2.5">
                  <span className="w-9 shrink-0 pt-1.5 text-xs text-foreground-tertiary">
                    {group.stageName}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {group.grades.map((grade) => (
                      <ChoiceChip
                        key={grade.id}
                        active={gradeId === grade.id}
                        onClick={() => onGrade(gradeId === grade.id ? null : grade.id)}
                      >
                        {grade.name}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-bold text-foreground">
              {t("learn.filterSubjectSection")}
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subjects.map((subject) => {
                const Icon = SUBJECT_ICONS[subject.name] ?? BookOpen;
                return (
                  <ChoiceChip
                    key={subject.id}
                    active={subjectId === subject.id}
                    onClick={() => onSubject(subjectId === subject.id ? null : subject.id)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{subject.name}</span>
                  </ChoiceChip>
                );
              })}
            </div>
          </section>
        </div>

        {saveFailed && (
          <div className="px-5 pb-4 sm:px-6">
            <p role="alert" className="text-xs text-destructive">
              {t("account.saveFailed")}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
