"use client";

import { ChapterBrowser } from "@/components/learn/chapter-browser";
import { KnowledgeBrowser } from "@/components/learn/knowledge-browser";
import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fetchCatalog, findTextbook, type TextbookDto } from "@/lib/learn/api";
import {
  BookOpen,
  Loader2,
  Network,
  RefreshCw,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type View = "chapters" | "knowledge";
type Status = "loading" | "error" | "ready";

/**
 * 学习首页：未选教材 → 引导去「我的教材」选择；
 * 已选教材 → 当前教材横幅 +「按章节学 / 按知识点学」两个入口。
 */
export default function LearnPage() {
  const { t } = useLocale();

  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<TextbookDto | null>(null);
  const [view, setView] = useState<View>("chapters");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchCatalog()
      .then((data) => {
        if (!alive) return;
        const textbook = findTextbook(data, data.selectedTextbookId ?? null);
        setSelected(textbook);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("learn.loading")}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="pb-6 md:pb-8">
        <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 card-shadow">
          <p className="font-bold">{t("learn.loadErrorTitle")}</p>
          <p className="text-sm text-foreground-secondary">{t("learn.loadErrorBody")}</p>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t("learn.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="pb-6 md:pb-8">
        <div className="rounded-lg border border-primary/25 bg-primary-light px-4 py-3.5">
          <p className="text-sm font-bold text-primary-strong">
            {t("learn.selectTextbookTitle")}
          </p>
          <p className="mt-1 text-xs leading-5 text-foreground-secondary">
            {t("learn.selectTextbookBody")}
          </p>
        </div>
        <Button asChild className="mt-4 w-full sm:w-auto">
          <Link href="/account/textbook">{t("learn.switchTextbook")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-6 md:pb-8">
      {/* Compact textbook banner */}
      <section className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-gradient-to-br from-primary-light to-surface p-3 card-shadow sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TextbookCover textbook={selected} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{selected.name}</p>
            <p className="mt-0.5 truncate text-xs text-foreground-secondary">
              {selected.publisherName} · {selected.gradeName} · {selected.semesterLabel} ·{" "}
              {t("learn.chaptersCount", { n: selected.chapterCount })} ·{" "}
              {t("learn.questionsCount", { n: selected.questionCount })}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild size="sm" className="w-full shrink-0 justify-center sm:w-auto">
          <Link href="/account/textbook">
            <Repeat className="mr-1.5 h-3.5 w-3.5" />
            {t("learn.switchTextbook")}
          </Link>
        </Button>
      </section>

      {/* Tab toggle */}
      <div className="mt-4 inline-flex gap-1 rounded-lg bg-surface-secondary p-1">
        <button
          type="button"
          onClick={() => setView("chapters")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            view === "chapters"
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-secondary hover:text-foreground"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t("learn.studyByChapter")}
        </button>
        <button
          type="button"
          onClick={() => setView("knowledge")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            view === "knowledge"
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-secondary hover:text-foreground"
          )}
        >
          <Network className="h-3.5 w-3.5" />
          {t("learn.studyByKnowledge")}
        </button>
      </div>

      {/* Active browser */}
      <div className="mt-4">
        {view === "chapters" ? (
          <ChapterBrowser textbook={selected} />
        ) : (
          <KnowledgeBrowser textbook={selected} />
        )}
      </div>
    </div>
  );
}
