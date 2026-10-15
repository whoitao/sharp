"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { BookOpen, Target, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

const featureIcons = [BookOpen, Target, TrendingUp, Zap];

export default function Home() {
  const { t, dict } = useLocale();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center gap-4 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            {t("home.heroPrefix")}{" "}
            <span className="text-primary">{t("home.heroHighlight")}</span>
            {t("home.heroSuffix") ? ` ${t("home.heroSuffix")}` : ""}
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            {t("home.heroSubtitle")}
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/docs">
            <Button size="lg">{t("home.getStarted")}</Button>
          </Link>
          <Link href="/about">
            <Button variant="outline" size="lg">
              {t("home.learnMore")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-6 bg-slate-50 py-8 dark:bg-slate-900 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            {t("home.featuresTitle")}
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            {t("home.featuresSubtitle")}
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-2 lg:grid-cols-4">
          {dict.home.features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <div
                key={feature.title}
                className="relative overflow-hidden rounded-lg border bg-background p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
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
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            {t("home.ctaSubtitle")}
          </p>
          <Link href="/docs">
            <Button size="lg" className="mt-4">
              {t("home.ctaButton")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
