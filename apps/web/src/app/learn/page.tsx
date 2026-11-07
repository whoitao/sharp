"use client";

import { ChapterBrowser } from "@/components/learn/chapter-browser";
import { KnowledgeBrowser } from "@/components/learn/knowledge-browser";
import { TextbookCover } from "@/components/learn/textbook-cover";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fetchCatalog, findTextbook, type TextbookDto } from "@/lib/learn/api";
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Network,
  RefreshCw,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type View = "hub" | "chapters" | "knowledge";
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
  const [view, setView] = useState<View>("hub");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchCatalog()
      .then((data) => {
        if (!alive) return;
        const textbook = findTextbook(data, data.selectedTextbookId ?? null);
        setSelected(textbook);
        setStatus("ready");
        setView("hub");
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

  if (view === "chapters") {
    return (
      <div className="pb-6 md:pb-8">
        <ChapterBrowser
          textbook={selected}
          onBack={() => setView("hub")}
          backLabel={t("learn.backToStudy")}
        />
      </div>
    );
  }

  if (view === "knowledge") {
    return (
      <div className="pb-6 md:pb-8">
        <KnowledgeBrowser textbook={selected} onBack={() => setView("hub")} />
      </div>
    );
  }

  return (
    <div className="pb-6 md:pb-8">
      <section className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-gradient-to-br from-primary-light to-surface p-4 card-shadow sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TextbookCover textbook={selected} size="sm" />
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.06em] text-primary-strong">
              {t("learn.currentLabel")}
            </p>
            <p className="mt-0.5 truncate text-base font-bold">{selected.name}</p>
            <p className="mt-0.5 truncate text-xs text-foreground-secondary">
              {selected.publisherName} · {selected.gradeName} · {selected.semesterLabel} ·{" "}
              {t("learn.chaptersCount", { n: selected.chapterCount })} ·{" "}
              {t("learn.questionsCount", { n: selected.questionCount })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          asChild
          className="w-full shrink-0 justify-center sm:w-auto"
        >
          <Link href="/account/textbook">
            <Repeat className="mr-1.5 h-4 w-4" />
            {t("learn.switchTextbook")}
          </Link>
        </Button>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setView("chapters")}
          className="group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-surface p-5 text-left card-shadow transition hover:-translate-y-0.5 hover:border-primary/35"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-light text-primary-strong">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 basis-[calc(100%-3.75rem)] sm:basis-0">
            <span className="block text-base font-bold">{t("learn.studyByChapter")}</span>
            <span className="mt-1 block text-sm leading-6 text-foreground-secondary">
              {t("learn.studyByChapterBody")}
            </span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-strong">
            {t("learn.enterStudy")}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setView("knowledge")}
          className="group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-surface p-5 text-left card-shadow transition hover:-translate-y-0.5 hover:border-primary/35"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-light text-primary-strong">
            <Network className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 basis-[calc(100%-3.75rem)] sm:basis-0">
            <span className="block text-base font-bold">{t("learn.studyByKnowledge")}</span>
            <span className="mt-1 block text-sm leading-6 text-foreground-secondary">
              {t("learn.studyByKnowledgeBody")}
            </span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-strong">
            {t("learn.enterStudy")}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
    </div>
  );
}
