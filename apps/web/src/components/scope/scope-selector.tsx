"use client";

import { ScopeDialog } from "@/components/scope/scope-dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { useStudyScope } from "@/lib/study-scope";
import { cn } from "@/lib/utils";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

/** 导航栏里的全局学习范围入口：与移动端一致，年级 / 科目存到账号设置 */
export function ScopeSelector() {
  const { t } = useLocale();
  const {
    ready,
    signedIn,
    grades,
    subjects,
    gradeId,
    subjectId,
    saving,
    saveFailed,
    setGrade,
    setSubject,
  } = useStudyScope();
  const [open, setOpen] = useState(false);

  // 年级用全量字典分组：学段顺序、年级顺序都取自 sortOrder，缺教材的年级也保留
  const gradeGroups = useMemo(() => {
    const groups = new Map<
      string,
      { stageId: string; stageName: string; grades: { id: string; name: string }[] }
    >();
    for (const grade of grades) {
      const option = { id: grade.id, name: grade.name };
      const group = groups.get(grade.stageId);
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
  }, [grades]);

  const gradeName =
    gradeGroups.flatMap((group) => group.grades).find((grade) => grade.id === gradeId)
      ?.name ?? null;
  const subjectName = subjects.find((subject) => subject.id === subjectId)?.name ?? null;
  const label = [gradeName, subjectName].filter(Boolean).join(" · ");

  if (!ready || !signedIn) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label || t("scope.placeholder")}
        className="h-8 gap-1.5 rounded-full border-border-light bg-surface px-2.5 text-[0.8125rem] font-semibold"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary" />
        <span
          className={cn(
            "hidden max-w-[9rem] truncate sm:inline",
            !label && "font-medium text-foreground-tertiary",
          )}
        >
          {label || t("scope.placeholder")}
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-foreground-tertiary sm:inline" />
      </Button>

      <ScopeDialog
        open={open}
        onClose={() => setOpen(false)}
        gradeGroups={gradeGroups}
        subjects={subjects}
        gradeId={gradeId}
        subjectId={subjectId}
        onGrade={setGrade}
        onSubject={setSubject}
        saving={saving}
        saveFailed={saveFailed}
      />
    </>
  );
}
