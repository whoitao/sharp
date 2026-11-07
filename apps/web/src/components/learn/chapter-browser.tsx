"use client";

import {
  StudyBreadcrumb,
  StudyHeaderCard,
  StudyTreePanel,
  StudyTreeRow,
  StudyUnitPanel,
  useStudyUnitMeta,
} from "@/components/learn/study-browser-ui";
import { useLocale } from "@/lib/i18n";
import {
  fetchChapterTree,
  fetchRecords,
  fetchUnits,
  firstChapterWithQuestions,
  quizHref,
  type ChapterNodeDto,
  type StudyRecordDto,
  type TextbookDto,
  type UnitsResponse,
} from "@/lib/learn/api";
import { Fragment, useEffect, useMemo, useState } from "react";

type Status = "loading" | "error" | "ready";

function TreeItems({
  nodes,
  activeId,
  depth,
  questionsLabel,
  onSelect,
}: {
  nodes: ChapterNodeDto[];
  activeId: string | null;
  depth: number;
  questionsLabel: (count: number) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <Fragment key={node.id}>
          <StudyTreeRow
            label={node.name}
            countLabel={questionsLabel(node.questionCount)}
            selected={node.id === activeId}
            depth={depth}
            onSelect={() => onSelect(node.id)}
          />
          {node.children.length > 0 && (
            <TreeItems
              nodes={node.children}
              activeId={activeId}
              depth={depth + 1}
              questionsLabel={questionsLabel}
              onSelect={onSelect}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

/** 二级视图：章节树 + 单元列表（单元即答题入口） */
export function ChapterBrowser({
  textbook,
  onBack,
  backLabel,
}: {
  textbook: TextbookDto;
  onBack: () => void;
  /** 返回入口文案：默认「教材目录」，从学习首页进入时传「学习」 */
  backLabel?: string;
}) {
  const { t } = useLocale();

  const [tree, setTree] = useState<ChapterNodeDto[] | null>(null);
  const [treeStatus, setTreeStatus] = useState<Status>("loading");
  const [treeReload, setTreeReload] = useState(0);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [units, setUnits] = useState<UnitsResponse | null>(null);
  const [unitsStatus, setUnitsStatus] = useState<Status>("loading");
  const [unitsReload, setUnitsReload] = useState(0);
  const [records, setRecords] = useState<StudyRecordDto[]>([]);

  useEffect(() => {
    let alive = true;
    setTreeStatus("loading");
    setUnits(null);
    fetchChapterTree(textbook.id)
      .then((data) => {
        if (!alive) return;
        setTree(data);
        // 默认选中第一个有题目的章节，没有则退回第一个章节以便提示「暂无题目」
        setActiveChapterId(firstChapterWithQuestions(data)?.id ?? data[0]?.id ?? null);
        setTreeStatus("ready");
      })
      .catch(() => {
        if (alive) setTreeStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [textbook.id, treeReload]);

  useEffect(() => {
    if (!activeChapterId) return;
    let alive = true;
    setUnitsStatus("loading");
    setUnits(null);
    setRecords([]);
    Promise.all([fetchUnits(activeChapterId), fetchRecords(activeChapterId)])
      .then(([unitsData, recordsData]) => {
        if (!alive) return;
        setUnits(unitsData);
        setRecords(recordsData.data ?? []);
        setUnitsStatus("ready");
      })
      .catch(() => {
        if (alive) setUnitsStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [activeChapterId, unitsReload]);

  const { timeFormatter, lastByUnit } = useStudyUnitMeta(records);

  const activeChapter = useMemo(() => {
    if (!tree || !activeChapterId) return null;
    const walk = (nodes: ChapterNodeDto[]): ChapterNodeDto | null => {
      for (const node of nodes) {
        if (node.id === activeChapterId) return node;
        const found = walk(node.children);
        if (found) return found;
      }
      return null;
    };
    return walk(tree);
  }, [tree, activeChapterId]);

  return (
    <div>
      <StudyBreadcrumb
        onBack={onBack}
        backLabel={backLabel ?? t("learn.backToCatalog")}
        items={activeChapter ? [textbook.name, activeChapter.name] : [textbook.name]}
      />

      <StudyHeaderCard textbook={textbook} />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <StudyTreePanel
          status={treeStatus}
          empty={(tree?.length ?? 0) === 0}
          emptyText={t("learn.treeEmpty")}
          onRetry={() => setTreeReload((k) => k + 1)}
        >
          <TreeItems
            nodes={tree ?? []}
            activeId={activeChapterId}
            depth={0}
            questionsLabel={(count) => t("learn.questionsCount", { n: count })}
            onSelect={setActiveChapterId}
          />
        </StudyTreePanel>

        <StudyUnitPanel
          title={activeChapter?.name ?? t("learn.unitsTitle")}
          meta={
            units
              ? t("learn.unitsMeta", {
                  units: units.totalUnits,
                  questions: units.totalQuestions,
                })
              : t("learn.loading")
          }
          status={unitsStatus}
          units={units}
          lastByUnit={lastByUnit}
          timeFormatter={timeFormatter}
          hrefFor={(unit) => quizHref(activeChapterId!, unit.unitIndex)}
          emptyTitle={t("learn.unitsEmptyTitle")}
          emptyBody={t("learn.unitsEmptyBody")}
          onRetry={() => setUnitsReload((k) => k + 1)}
        />
      </div>
    </div>
  );
}
