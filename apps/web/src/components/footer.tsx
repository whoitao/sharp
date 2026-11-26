"use client";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ArrowUp, Github } from "lucide-react";
import Link from "next/link";

const GITHUB_URL = "https://github.com/whoitao/sharp";

const linkClass =
  "inline-flex min-h-5 items-center text-xs leading-4 text-foreground-secondary transition-colors hover:text-foreground";
const pillClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-secondary transition-colors hover:text-foreground";
const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground-secondary transition-colors hover:border-primary hover:text-foreground";
const badgeClass =
  "rounded bg-primary-light px-1.5 text-xs font-medium leading-4 text-primary-strong";

type FooterLink = {
  labelKey: string;
  href: string;
  external?: boolean;
  badgeKey?: string;
};

const columns: { titleKey: string; links: FooterLink[] }[] = [
  {
    titleKey: "footer.product",
    links: [
      { labelKey: "nav.learn", href: "/learn" },
      { labelKey: "footer.privacy", href: "/privacy-policy" },
      { labelKey: "footer.terms", href: "/wiki/terms-of-service" },
    ],
  },
  {
    titleKey: "footer.discover",
    links: [
      { labelKey: "nav.articles", href: "/articles" },
      { labelKey: "nav.wiki", href: "/wiki" },
    ],
  },
  {
    titleKey: "footer.about",
    links: [
      { labelKey: "footer.aboutUs", href: "/about" },
      { labelKey: "footer.feedback", href: "/account/feedback" },
      { labelKey: "footer.contact", href: "/about#contact" },
    ],
  },
];

export function Footer({
  siteName = "Sharp",
  siteUrl = "https://sharp.whoitao.top",
  icpNumber = null,
}: {
  siteName?: string;
  siteUrl?: string;
  icpNumber?: string | null;
}) {
  const { t } = useLocale();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto max-w-[1200px] px-4 pb-6 pt-10">
        <div className="grid grid-cols-2 gap-6 md:gap-5 lg:grid-cols-[2.2fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {siteName.slice(0, 1).toUpperCase() || "S"}
              </span>
              <span className="text-xl font-bold text-primary">{siteName}</span>
            </Link>
            <p className="mt-3.5 max-w-[34ch] text-sm leading-6 text-foreground-secondary">
              {t("footer.tagline")}
            </p>
            <div className="mt-4 flex gap-2.5">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className={iconButtonClass}
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.titleKey}>
              <h4 className="mb-2 flex h-5 items-center text-xs font-semibold uppercase leading-4 tracking-wider text-foreground-tertiary">
                {t(column.titleKey)}
              </h4>
              <ul className="flex flex-col gap-0">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(linkClass, "gap-1.5")}
                      >
                        {t(link.labelKey)}
                        {link.badgeKey ? (
                          <span className={badgeClass}>{t(link.badgeKey)}</span>
                        ) : null}
                      </a>
                    ) : (
                      <Link href={link.href} className={linkClass}>
                        {t(link.labelKey)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border-light pt-4">
          <p className="text-xs text-foreground-tertiary">
            © 2026-present{" "}
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-secondary transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
            >
              {siteName}
            </a>
            {" · "}
            {t("footer.rights")}
            {icpNumber ? (
              <>
                {" · "}
                <a
                  href="https://beian.miit.gov.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  {icpNumber}
                </a>
              </>
            ) : null}
          </p>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle side="top" />
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={pillClass}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {t("footer.backToTop")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
