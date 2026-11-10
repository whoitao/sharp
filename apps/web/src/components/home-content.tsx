"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { BookMarked, BookOpen, GraduationCap, Layers, Sigma, Smartphone, Target } from "lucide-react";
import Link from "next/link";

const pathIcons = [BookOpen, Target, Layers];
const advantageIcons = [Target, Sigma, GraduationCap, BookMarked, Smartphone];

export function HomeContent() {
  const { t, dict } = useLocale();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center gap-4 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            {t("home.heroPrefix")}
            <span className="text-primary">{t("home.heroHighlight")}</span>
            {t("home.heroSuffix") ? ` ${t("home.heroSuffix")}` : ""}
          </h1>
          <p className="max-w-[750px] text-lg text-foreground-secondary sm:text-xl">
            {t("home.heroSubtitle")}
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/wiki">
            <Button size="lg">{t("home.getStarted")}</Button>
          </Link>
          <Link href="#paths">
            <Button variant="outline" size="lg">
              {t("home.learnMore")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Learning Paths Section */}
      <section id="paths" className="space-y-6 bg-surface-secondary py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            {t("home.pathsTitle")}
          </h2>
          <p className="max-w-[85%] leading-normal text-foreground-secondary sm:text-lg sm:leading-7">
            {t("home.pathsSubtitle")}
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] lg:grid-cols-3">
          {dict.home.paths.map((path, index) => {
            const Icon = pathIcons[index];
            return (
              <div
                key={path.title}
                className="relative overflow-hidden rounded-lg border border-border bg-surface p-6 text-center card-shadow transition-transform hover:-translate-y-0.5"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
                  <Icon className="h-6 w-6 text-primary-strong" />
                </div>
                <h3 className="mb-2 font-bold">{path.title}</h3>
                <p className="text-sm text-foreground-secondary">
                  {path.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Advantages Section */}
      <section className="space-y-6 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            {t("home.advantagesTitle")}
          </h2>
          <p className="max-w-[85%] leading-normal text-foreground-secondary sm:text-lg sm:leading-7">
            {t("home.advantagesSubtitle")}
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[72rem] lg:grid-cols-5">
          {dict.home.advantages.map((advantage, index) => {
            const Icon = advantageIcons[index];
            return (
              <div
                key={advantage.title}
                className="relative overflow-hidden rounded-lg border border-border bg-surface p-6 text-center card-shadow transition-transform hover:-translate-y-0.5"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
                  <Icon className="h-6 w-6 text-primary-strong" />
                </div>
                <h3 className="mb-2 font-bold">{advantage.title}</h3>
                <p className="text-sm text-foreground-secondary">
                  {advantage.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            {t("home.ctaTitle")}
          </h2>
          <p className="max-w-[85%] leading-normal text-foreground-secondary sm:text-lg sm:leading-7">
            {t("home.ctaSubtitle")}
          </p>
          <Link href="/wiki">
            <Button size="lg" className="mt-4">
              {t("home.ctaButton")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
