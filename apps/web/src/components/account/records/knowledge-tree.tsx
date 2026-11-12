"use client";

import { useLocale } from "@/lib/i18n";
import type { KnowledgePointStatDto } from "@/lib/learn/api";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { accuracyOf, accuracyTone } from "./format";

interface KpRow {
  node: KnowledgePointStatDto;
  depth: number;
  isCollapsed: boolean;
}

/** G 知识点视角：上色图例 + 可折叠树（与移动端同一套 85/60 阈值） */
export function KnowledgeTree({ nodes }: { nodes: KnowledgePointStatDto[] }) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => {
    const rows: KpRow[] = [];
    const parentIds: string[] = [];
    const collectParents = (list: KnowledgePointStatDto[]) => {
      for (const node of list) {
        if (node.children.length > 0) {
          parentIds.push(node.id);
          collectParents(node.children);
        }
      }
    };
    const walk = (list: KnowledgePointStatDto[], depth: number) => {
      for (const node of list) {
        const isCollapsed = !!collapsed[node.id];
        rows.push({ node, depth, isCollapsed });
        if (!isCollapsed) walk(node.children, depth + 1);
      }
    };
    collectParents(nodes);
    walk(nodes, 0);
    return {
      rows,
      allCollapsed: parentIds.length > 0 && parentIds.every((id) => collapsed[id]),
      collapseAll: (next: boolean) =>
        setCollapsed(next ? Object.fromEntries(parentIds.map((id) => [id, true])) : {}),
    };
  }, [nodes, collapsed]);

  const legends = [
    { key: "strong", label: t("records.legendStrong"), dot: "bg-primary-strong" },
    { key: "fair", label: t("records.legendFair"), dot: "bg-warning" },
    { key: "weak", label: t("records.legendWeak"), dot: "bg-destructive" },
    { key: "none", label: t("records.legendNone"), dot: "bg-foreground-tertiary" },
  ];

  return (
    // 页面级留白由调用方负责，这里只管组件自身
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 card-shadow">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legends.map((legend) => (
            <span key={legend.key} className="inline-flex items-center gap-1.5 text-xs text-foreground-tertiary">
              <span className={cn("h-2 w-2 rounded-full", legend.dot)} />
              {legend.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => tree.collapseAll(!tree.allCollapsed)}
          className="text-xs font-semibold text-primary-strong transition-colors hover:text-primary"
        >
          {tree.allCollapsed ? t("records.expandAll") : t("records.collapseAll")}
        </button>
      </div>

      <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface card-shadow">
        {tree.rows.map(({ node, depth, isCollapsed }) => {
          const started = node.answeredQuestions > 0;
          const accuracy = accuracyOf(node.correctQuestions, node.answeredQuestions);
          return (
            <div
              key={node.id}
              className="flex items-center gap-2 py-2.5 pr-3"
              // 缩进用 rem，跟着根字号（信息密度）一起缩放
              style={{ paddingInlineStart: `${0.75 + depth * 0.875}rem` }}
            >
              {node.children.length > 0 ? (
                <button
                  type="button"
                  aria-label={node.name}
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [node.id]: !isCollapsed }))}
                  className="shrink-0 rounded-sm p-0.5 text-foreground-tertiary transition-colors hover:text-foreground"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-[1.125rem] shrink-0" />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  depth === 0
                    ? "font-semibold text-foreground"
                    : "text-foreground-secondary",
                )}
              >
                {node.name}
              </span>
              <span className="shrink-0 tabular-nums text-xs text-foreground-tertiary">
                {node.answeredQuestions}/{node.totalQuestions}
              </span>
              <span
                className={cn(
                  "w-12 shrink-0 text-right text-xs font-bold tabular-nums",
                  accuracyTone(accuracy, started),
                )}
              >
                {started ? `${accuracy}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
