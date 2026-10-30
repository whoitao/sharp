"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { BookOpen, Code, Database, Layers } from "lucide-react";
import Link from "next/link";

const sectionIcons = [Layers, Code, Database, BookOpen];

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

      <div className="mx-auto mt-12 max-w-[58rem] space-y-8">
        {dict.docs.sections.map((section, index) => {
          const Icon = sectionIcons[index];
          return (
            <div
              key={section.title}
              className="rounded-lg border border-border bg-surface p-6 card-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                  <Icon className="h-6 w-6 text-primary-strong" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-bold">{section.title}</h2>
                  <p className="mb-4 text-sm text-foreground-secondary">
                    {section.description}
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-surface-secondary p-4 text-sm">
                    <code>{section.content}</code>
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-[58rem] flex justify-center">
        <Link href="/">
          <Button variant="outline">{t("common.backHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
