"use client";

import { TextbookCover } from "@/components/learn/textbook-cover";
import { TextbookPicker } from "@/components/learn/textbook-picker";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fetchCatalog, type TextbookDto } from "@/lib/learn/api";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "loading" | "error" | "ready";

/** 我的教材：当前教材 + 页面内直接选教材，选中后即时更新上方卡片 */
export function TextbookPanel() {
  const { t } = useLocale();
  const [textbook, setTextbook] = useState<TextbookDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchCatalog()
      .then((catalog) => {
        if (!alive) return;
        const all = catalog.stages.flatMap((stage) =>
          stage.subjects.flatMap((subject) => subject.textbooks),
        );
        setTextbook(
          all.find((item) => item.id === catalog.selectedTextbookId) ??
            all.find((item) => item.selected) ??
            null,
        );
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
        {t("account.loading")}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
        <p className="text-sm font-semibold">{t("account.loadErrorTitle")}</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {t("account.loadErrorBody")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          {t("account.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {textbook ? (
        <section className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-gradient-to-br from-primary-light to-surface p-4 card-shadow sm:flex-row sm:items-center sm:gap-4 md:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TextbookCover textbook={textbook} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-primary-strong">
                {t("learn.currentLabel")}
              </p>
              <p className="mt-0.5 truncate text-base font-bold">{textbook.name}</p>
              <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                {textbook.publisherName} · {textbook.gradeName} · {textbook.semesterLabel} ·{" "}
                {t("learn.chaptersCount", { n: textbook.chapterCount })} ·{" "}
                {t("learn.questionsCount", { n: textbook.questionCount })}
              </p>
            </div>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/learn">{t("learn.openChapters")}</Link>
          </Button>
        </section>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5 card-shadow md:p-6">
          <p className="text-sm font-semibold">{t("account.myTextbook")}</p>
          <p className="mt-1 text-xs text-foreground-secondary">
            {t("account.myTextbookEmpty")}
          </p>
        </div>
      )}

      <TextbookPicker onOpen={setTextbook} />
    </div>
  );
}
