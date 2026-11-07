"use client";

import { RichText } from "@/components/learn/rich-text";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WikiPageDetail, WikiTreeNode } from "@/lib/wiki/api";
import { ChevronDown, ChevronRight, List } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function findChain(
  nodes: WikiTreeNode[],
  path: string,
  acc: WikiTreeNode[] = [],
): WikiTreeNode[] {
  for (const node of nodes) {
    const next = [...acc, node];
    if (node.path === path) return next;
    const found = findChain(node.children, path, next);
    if (found.length > 0) return found;
  }
  return [];
}

interface TreeRowsProps {
  nodes: WikiTreeNode[];
  depth: number;
  activePath: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}

function WikiTreeRows({ nodes, depth, activePath, collapsed, onToggle }: TreeRowsProps) {
  return (
    <ul className={depth === 0 ? "divide-y divide-border-light" : undefined}>
      {nodes.map((node) => {
        const selected = node.path === activePath;
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsed.has(node.id);
        return (
          <li key={node.id}>
            <div
              className={cn(
                "flex items-center transition-colors",
                selected ? "bg-primary-light" : "hover:bg-surface-secondary",
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => onToggle(node.id)}
                  className="flex h-8 w-7 shrink-0 items-center justify-center text-foreground-tertiary transition-colors hover:text-foreground"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-7 shrink-0" />
              )}
              <Link
                href={`/wiki/${node.path}`}
                aria-current={selected ? "page" : undefined}
                title={node.title}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
                className={cn(
                  "min-w-0 flex-1 truncate py-2 pr-3",
                  depth === 0 ? "text-sm font-semibold" : "text-xs",
                  selected ? "text-primary-strong" : "text-foreground",
                )}
              >
                {node.title}
              </Link>
            </div>
            {hasChildren && !isCollapsed && (
              <WikiTreeRows
                nodes={node.children}
                depth={depth + 1}
                activePath={activePath}
                collapsed={collapsed}
                onToggle={onToggle}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Wiki 浏览页：左侧树 + 右侧正文，窄屏目录可收起 */
export function WikiBrowser({
  tree,
  detail,
}: {
  tree: WikiTreeNode[];
  detail: WikiPageDetail | null;
}) {
  const { t, locale } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const crumbs = useMemo(() => {
    if (!detail) return [];
    const chain = findChain(tree, detail.path);
    return chain.length > 0
      ? chain.map((node) => ({ path: node.path, title: node.title }))
      : [{ path: detail.path, title: detail.title }];
  }, [tree, detail]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [locale],
  );

  const toggleNode = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground-secondary card-shadow lg:hidden"
      >
        <List className="h-4 w-4" />
        {mobileOpen ? t("wiki.hideToc") : t("wiki.toc")}
      </button>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-surface card-shadow lg:sticky lg:top-20 lg:block",
            mobileOpen ? "block" : "hidden",
          )}
        >
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            {t("wiki.title")}
          </div>
          <div className="max-h-[60vh] overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
            {tree.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-foreground-tertiary">
                {t("wiki.empty")}
              </p>
            ) : (
              <WikiTreeRows
                nodes={tree}
                depth={0}
                activePath={detail?.path ?? null}
                collapsed={collapsed}
                onToggle={toggleNode}
              />
            )}
          </div>
        </aside>

        <article className="min-w-0 rounded-lg border border-border bg-surface p-5 card-shadow md:p-8">
          {detail ? (
            <>
              <nav
                aria-label="breadcrumb"
                className="flex flex-wrap items-center gap-1 text-xs text-foreground-tertiary"
              >
                <Link href="/wiki" className="transition-colors hover:text-foreground">
                  {t("wiki.title")}
                </Link>
                {crumbs.map((crumb, index) => (
                  <span key={crumb.path} className="flex items-center gap-1">
                    <span>/</span>
                    {index === crumbs.length - 1 ? (
                      <span className="text-foreground-secondary">{crumb.title}</span>
                    ) : (
                      <Link
                        href={`/wiki/${crumb.path}`}
                        className="transition-colors hover:text-foreground"
                      >
                        {crumb.title}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>

              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                {detail.title}
              </h1>
              {detail.summary && (
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                  {detail.summary}
                </p>
              )}
              <p className="mt-2 text-xs text-foreground-tertiary">
                {t("wiki.updatedAt", {
                  date: dateFormatter.format(new Date(detail.updatedAt)),
                })}
              </p>

              <div className="mt-6 border-t border-border pt-6">
                {detail.content ? (
                  <RichText html={detail.content} className="text-sm leading-relaxed" />
                ) : (
                  <p className="text-sm text-foreground-tertiary">{t("wiki.emptyContent")}</p>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-foreground-tertiary">
              {tree.length === 0 ? t("wiki.empty") : t("wiki.emptyContent")}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
