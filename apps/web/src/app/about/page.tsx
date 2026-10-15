"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { Heart, Mail } from "lucide-react";
import Link from "next/link";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.05.78 2.12 0 1.54-.01 2.77-.01 3.15 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function About() {
  const { t, dict } = useLocale();

  return (
    <div className="py-8 md:py-12 lg:py-18">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
          {t("about.title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-[750px]">
          {t("about.subtitle")}
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-[58rem] space-y-8">
        {/* Mission */}
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{t("about.missionTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("about.missionText")}
          </p>
        </div>

        {/* Features Highlight */}
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{t("about.whyTitle")}</h2>
          <ul className="space-y-3 text-muted-foreground">
            {dict.about.whyItems.map((item) => (
              <li key={item.label} className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>
                  <strong>{item.label}</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tech Stack */}
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{t("about.builtTitle")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {dict.about.techItems.map((item) => (
              <div key={item.name} className="rounded-md bg-muted p-3 text-center">
                <div className="font-semibold">{item.name}</div>
                <div className="text-muted-foreground">{item.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-lg border bg-card p-8 shadow-sm text-center">
          <h2 className="text-2xl font-bold mb-4">{t("about.contactTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("about.contactText")}</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/whoitao/sharp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/whoitao/sharp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mail className="mr-2 h-4 w-4" />
                {t("about.contactButton")}
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto mt-12 max-w-[58rem] text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-1">
          {t("about.footerA")}{" "}
          <Heart className="h-4 w-4 text-red-500 fill-red-500" />{" "}
          {t("about.footerB")}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-[58rem] flex justify-center">
        <Link href="/">
          <Button variant="outline">{t("common.backHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
