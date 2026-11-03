"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";

// 每个章节对应的操作截图（手机端），与 sections 顺序一一对应
const sectionImages = [
  "/guide/textbook.jpg",
  "/guide/chapter.jpg",
  "/guide/knowledge.jpg",
  "/guide/result.jpg",
  "/guide/analysis.jpg",
  "/guide/stats.jpg",
];

export default function Docs() {
  const { t, dict } = useLocale();

  return (
    <div className="py-8 md:py-12 lg:py-18">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
          {t("docs.title")}
        </h1>
        <p className="text-lg text-foreground-secondary">{t("docs.subtitle")}</p>
      </div>

      <div className="mx-auto mt-14 max-w-[60rem]">
        {dict.docs.sections.map((section, index) => {
          const image = sectionImages[index];
          return (
            <section
              key={section.title}
              className={`grid gap-8 md:grid-cols-[260px_1fr] md:items-start md:gap-12 ${
                index > 0 ? "mt-12 border-t border-border pt-12" : ""
              }`}
            >
              {image && (
                <div className="w-[min(70vw,260px)] md:sticky md:top-24 md:w-full">
                  <Image
                    src={image}
                    alt={section.title}
                    width={520}
                    height={1150}
                    className="h-auto w-full rounded-xl border border-border bg-surface shadow-sm"
                  />
                </div>
              )}

              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-semibold tabular-nums tracking-wider text-primary-strong">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>

                <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-foreground-secondary">
                  {section.description}
                </p>

                <ol className="mt-5 max-w-[34rem] space-y-2.5 text-sm leading-relaxed text-foreground-secondary">
                  {section.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-3">
                      <span className="shrink-0 text-xs font-medium tabular-nums text-primary-strong">
                        {stepIndex + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mx-auto mt-16 flex max-w-[58rem] justify-center">
        <Link href="/">
          <Button variant="outline">{t("common.backHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
