"use client";

import {
  StudyTreePanel,
  StudyTreeRow,
  StudyUnitPanel,
  useStudyUnitMeta,
} from "@/components/learn/study-browser-ui";
import { useLocale } from "@/lib/i18n";
import {
  fetchKnowledgePoints,
  fetchKnowledgeRecords,
  fetchKnowledgeUnits,
  firstKnowledgePointWithQuestions,
  knowledgeQuizHref,
  type KnowledgePointDto,
  type StudyRecordDto,
  type TextbookDto,
  type UnitsResponse,
} from "@/lib/learn/api";
import { Fragment, useEffect, useMemo, useState } from "react";

type Status = "loading" | "error" | "ready";

function KnowledgeTree({
  nodes,
  activeId,
  depth,
  questionsLabel,
  noQuestionsLabel,
  onSelect,
}: {
  nodes: KnowledgePointDto[];
  activeId: string | null;
  depth: number;
  questionsLabel: (count: number) => string;
  noQuestionsLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const enabled = node.questionCount > 0;
        return (
          <Fragment key={node.id}>
            <StudyTreeRow
              label={node.name}
              countLabel={enabled ? questionsLabel(node.questionCount) : noQuestionsLabel}
              selected={node.id === activeId}
              disabled={!enabled}
              depth={depth}
              onSelect={() => onSelect(node.id)}
            />
            {node.children.length > 0 && (
              <KnowledgeTree
                nodes={node.children}
                activeId={activeId}
                depth={depth + 1}
                questionsLabel={questionsLabel}
                noQuestionsLabel={noQuestionsLabel}
                onSelect={onSelect}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * 「按知识点学」：知识点树 + 单元列表。
 * 学习范围（科目/学段/年级/版本）取自当前已选教材，与移动端进入
 * KnowledgeUnits 时传入的参数口径一致。
 */
export function KnowledgeBrowser({
  textbook,
}: {
  textbook: TextbookDto;
}) {
  const { t } = useLocale();

  const [tree, setTree] = useState<KnowledgePointDto[] | null>(null);
  const [treeStatus, setTreeStatus] = useState<Status>("loading");
  const [treeReload, setTreeReload] = useState(0);
  const [activeKpId, setActiveKpId] = useState<string | null>(null);

  const [units, setUnits] = useState<UnitsResponse | null>(null);
  const [unitsStatus, setUnitsStatus] = useState<Status>("loading");
  const [unitsReload, setUnitsReload] = useState(0);
  const [records, setRecords] = useState<StudyRecordDto[]>([]);

  useEffect(() => {
    let alive = true;
    setTreeStatus("loading");
    setUnits(null);
    fetchKnowledgePoints({
      subjectId: textbook.subjectId,
      stageId: textbook.stageId,
      gradeId: textbook.gradeId,
      publisherId: textbook.publisherId,
    })
      .then((data) => {
        if (!alive) return;
        setTree(data);
        // 默认选中第一个有题目的知识点，没有则退回第一个以便提示「暂无题目」
        setActiveKpId(firstKnowledgePointWithQuestions(data)?.id ?? data[0]?.id ?? null);
        setTreeStatus("ready");
      })
      .catch(() => {
        if (alive) setTreeStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [textbook.id, textbook.subjectId, textbook.stageId, textbook.gradeId, textbook.publisherId, treeReload]);

  useEffect(() => {
    if (!activeKpId) return;
    let alive = true;
    setUnitsStatus("loading");
    setUnits(null);
    setRecords([]);
    Promise.all([
      fetchKnowledgeUnits({
        subjectId: textbook.subjectId,
        gradeId: textbook.gradeId,
        publisherId: textbook.publisherId,
        knowledgePointId: activeKpId,
      }),
      // 学习记录只用于「上次学习」，失败不影响单元列表
      fetchKnowledgeRecords(activeKpId).catch(() => ({ data: [], total: 0 })),
    ])
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
  }, [textbook.subjectId, textbook.gradeId, textbook.publisherId, activeKpId, unitsReload]);

  const { timeFormatter, lastByUnit } = useStudyUnitMeta(records);

  const activeKp = useMemo(() => {
    if (!tree || !activeKpId) return null;
    const walk = (nodes: KnowledgePointDto[]): KnowledgePointDto | null => {
      for (const node of nodes) {
        if (node.id === activeKpId) return node;
        const found = walk(node.children);
        if (found) return found;
      }
      return null;
    };
    return walk(tree);
  }, [tree, activeKpId]);

  return (
    <div>
      <div className="grid items-start gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <StudyTreePanel
          status={treeStatus}
          empty={(tree?.length ?? 0) === 0}
          emptyText={t("learn.knowledgeTreeEmpty")}
          onRetry={() => setTreeReload((k) => k + 1)}
        >
          <KnowledgeTree
            nodes={tree ?? []}
            activeId={activeKpId}
            depth={0}
            questionsLabel={(count) => t("learn.questionsCount", { n: count })}
            noQuestionsLabel={t("learn.noQuestions")}
            onSelect={setActiveKpId}
          />
        </StudyTreePanel>

        <StudyUnitPanel
          title={activeKp?.name ?? t("learn.knowledgeUnitsTitle")}
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
          hrefFor={(unit) =>
            knowledgeQuizHref({
              subjectId: textbook.subjectId,
              gradeId: textbook.gradeId,
              publisherId: textbook.publisherId,
              knowledgePointId: activeKpId!,
              knowledgePointName: activeKp?.name ?? null,
              unitIndex: unit.unitIndex,
            })
          }
          emptyTitle={t("learn.knowledgeEmptyTitle")}
          emptyBody={t("learn.knowledgeEmptyBody")}
          onRetry={() => setUnitsReload((k) => k + 1)}
        />
      </div>
    </div>
  );
}
