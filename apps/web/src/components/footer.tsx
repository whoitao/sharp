"use client";

import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ArrowUp, Github, Globe, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";

const GITHUB_URL = "https://github.com/whoitao/sharp";

const linkClass = "text-xs text-foreground-secondary transition-colors hover:text-foreground";
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
      { labelKey: "footer.privacy", href: "/privacy" },
      { labelKey: "footer.terms", href: "/terms" },
    ],
  },
  {
    titleKey: "footer.discover",
    links: [
      { labelKey: "nav.articles", href: "/articles" },
      { labelKey: "nav.wiki", href: "/wiki" },
      { labelKey: "footer.docs", href: "/docs" },
    ],
  },
  {
    titleKey: "footer.about",
    links: [
      { labelKey: "footer.aboutUs", href: "/about" },
      { labelKey: "footer.contact", href: "/about#contact" },
      { labelKey: "nav.github", href: GITHUB_URL, external: true, badgeKey: "footer.openSource" },
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
  const { t, locale, setLocale } = useLocale();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const ThemeIcon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;
  const themeLabel =
    theme === "system"
      ? t("footer.themeSystem")
      : theme === "dark"
        ? t("footer.themeDark")
        : t("footer.themeLight");

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto max-w-[1200px] px-4 pb-6 pt-10">
        <div className="grid grid-cols-2 gap-8 md:gap-6 lg:grid-cols-[2.2fr_1fr_1fr_1fr]">
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
              <h4 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                {t(column.titleKey)}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(linkClass, "inline-flex items-center gap-1.5")}
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
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={themeLabel}
              className={pillClass}
            >
              <ThemeIcon className="h-3.5 w-3.5" />
              {themeLabel}
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
              className={pillClass}
            >
              <Globe className="h-3.5 w-3.5" />
              <span className={cn(locale === "zh" && "font-semibold text-foreground")}>中文</span>
              <span aria-hidden="true">/</span>
              <span className={cn(locale === "en" && "font-semibold text-foreground")}>EN</span>
            </button>
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
