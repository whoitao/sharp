"use client";

import { RichText } from "@/components/learn/rich-text";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WikiPageDetail, WikiTreeNode } from "@/lib/wiki/api";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, List } from "lucide-react";
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

/** 目录树的阅读顺序（深度优先），用于推导上一篇 / 下一篇 */
function flattenTree(nodes: WikiTreeNode[], acc: WikiTreeNode[] = []): WikiTreeNode[] {
  for (const node of nodes) {
    acc.push(node);
    flattenTree(node.children, acc);
  }
  return acc;
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
    <ul className={cn(depth === 0 && "divide-y divide-border-light")}>
      {nodes.map((node) => {
        const selected = node.path === activePath;
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsed.has(node.id);
        return (
          <li key={node.id}>
            <div
              className={cn(
                "relative flex items-center transition-colors",
                selected ? "bg-primary-light" : "hover:bg-surface-secondary",
              )}
            >
              {selected && (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-primary"
                />
              )}
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
                  "min-w-0 flex-1 truncate py-1.5 pr-3 leading-5",
                  depth === 0 ? "text-sm font-semibold" : "text-xs",
                  selected
                    ? "text-primary-strong"
                    : depth === 0
                      ? "text-foreground"
                      : "text-foreground-secondary",
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

/** Wiki 浏览页：左侧目录卡 + 右侧正文卡，窄屏目录收进顶部条 */
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

  const neighbors = useMemo(() => {
    if (!detail) return { prev: null, next: null };
    const flat = flattenTree(tree);
    const index = flat.findIndex((node) => node.path === detail.path);
    return {
      prev: index > 0 ? flat[index - 1] : null,
      next: index >= 0 ? (flat[index + 1] ?? null) : null,
    };
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
    <div className="pt-1">
      {/* 窄屏：sticky 目录条 + 展开卡片 */}
      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-border-light bg-background/90 px-4 py-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-sm border px-3 text-sm transition-colors card-shadow",
            mobileOpen
              ? "border-primary bg-primary-light text-primary-strong"
              : "border-border bg-surface text-foreground-secondary",
          )}
        >
          <List className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left font-semibold">
            {mobileOpen ? t("wiki.hideToc") : (detail?.title ?? t("wiki.toc"))}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", mobileOpen && "rotate-180")}
          />
        </button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-[-1]"
              onClick={() => setMobileOpen(false)}
            />
            <div className="mt-2 max-h-[46vh] overflow-y-auto rounded-lg border border-border bg-surface card-shadow">
              <div className="border-b border-border-light px-4 pb-3 pt-4 text-xs font-bold tracking-wide text-foreground">
                {t("wiki.toc")}
              </div>
            <div className="py-2">
              {tree.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-foreground-tertiary">
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
            </div>
          </>
        )}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-5">
        <aside className="hidden lg:sticky lg:top-14 lg:block">
          <div className="overflow-hidden rounded-lg border border-border bg-surface card-shadow">
            <div className="flex items-center gap-2 border-b border-border-light px-4 pb-3 pt-4 text-xs font-bold tracking-wide text-foreground">
              <List className="h-4 w-4 shrink-0" />
              {t("wiki.toc")}
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto py-2">
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
          </div>
        </aside>

        <article className="min-w-0 rounded-lg border border-border bg-surface p-5 card-shadow sm:p-6">
          {detail ? (
            <>
              <nav
                aria-label="breadcrumb"
                className="flex flex-wrap items-center gap-2 text-xs text-foreground-tertiary"
              >
                <Link href="/wiki" className="transition-colors hover:text-foreground">
                  {t("wiki.title")}
                </Link>
                {crumbs.map((crumb, index) => (
                  <span key={crumb.path} className="flex items-center gap-2">
                    <span className="text-foreground-tertiary">/</span>
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

              <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight md:text-3xl">
                {detail.title}
              </h1>
              {detail.summary && (
                <p className="mt-3.5 max-w-[62ch] text-sm leading-[1.7] text-foreground-secondary">
                  {detail.summary}
                </p>
              )}
              <p className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-foreground-tertiary">
                {t("wiki.updatedAt", {
                  date: dateFormatter.format(new Date(detail.updatedAt)),
                })}
              </p>

              <div className="mt-6 border-t border-border-light" />

              <div className="mt-5">
                {detail.content ? (
                  <RichText html={detail.content} className="[&>*:first-child]:!mt-0" />
                ) : (
                  <p className="text-sm text-foreground-tertiary">{t("wiki.emptyContent")}</p>
                )}
              </div>

              {(neighbors.prev || neighbors.next) && (
                <nav
                  aria-label={`${t("wiki.prev")} / ${t("wiki.next")}`}
                  className="mt-9 grid gap-4 border-t border-border-light pt-6 md:grid-cols-2"
                >
                  {neighbors.prev ? (
                    <Link
                      href={`/wiki/${neighbors.prev.path}`}
                      className="flex flex-col gap-1 rounded-sm bg-surface-secondary px-4 py-4 transition-colors hover:bg-primary-light"
                    >
                      <span className="flex items-center gap-1 text-xs text-foreground-tertiary">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {t("wiki.prev")}
                      </span>
                      <span className="text-sm font-semibold leading-snug text-foreground">
                        {neighbors.prev.title}
                      </span>
                    </Link>
                  ) : (
                    <span aria-hidden className="hidden md:block" />
                  )}
                  {neighbors.next ? (
                    <Link
                      href={`/wiki/${neighbors.next.path}`}
                      className="flex flex-col gap-1 rounded-sm bg-surface-secondary px-4 py-4 transition-colors hover:bg-primary-light md:items-end md:text-right"
                    >
                      <span className="flex items-center gap-1 text-xs text-foreground-tertiary">
                        {t("wiki.next")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold leading-snug text-foreground">
                        {neighbors.next.title}
                      </span>
                    </Link>
                  ) : (
                    <span aria-hidden className="hidden md:block" />
                  )}
                </nav>
              )}
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
