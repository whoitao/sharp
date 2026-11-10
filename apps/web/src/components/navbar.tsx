"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { ScopeSelector } from "@/components/scope/scope-selector";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, type Locale } from "@/lib/i18n";
import { subscribeSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Check, Globe, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const navItems = [
  { href: "/learn", labelKey: "nav.learn", requiresAuth: true },
  { href: "/leaderboard", labelKey: "nav.leaderboard", requiresAuth: true },
  { href: "/articles", labelKey: "nav.articles" },
  { href: "/wiki", labelKey: "nav.wiki" },
  { href: "/about", labelKey: "nav.about" },
];

const languageOptions: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

/** 登录态：学习与宠物入口仅登录后展示，未登录时不出现，避免点了才被拦 */
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/auth/session", { cache: "no-store" })
        .then((res) => res.json())
        .then((data: { user?: unknown }) => {
          if (alive) setSignedIn(!!data.user);
        })
        .catch(() => {
          /* 读取失败按未登录处理 */
        });
    };
    load();
    const unsubscribe = subscribeSession(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return signedIn;
}

/** 静态导航链接；pathname 由外层在运行时补齐，预渲染时先渲染无高亮版本 */
function NavLinks({ pathname }: { pathname?: string | null }) {
  const { t } = useLocale();
  const signedIn = useSignedIn();

  return (
    <nav className="flex items-center space-x-3 whitespace-nowrap text-sm font-medium sm:space-x-4 md:space-x-6 md:text-sm">
      {navItems
        .filter((item) => !item.requiresAuth || signedIn)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "transition-colors hover:text-foreground",
              // 子路由（如 /learn/quiz）也保持所属入口高亮
              pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(`${item.href}/`))
                ? "text-foreground"
                : "text-foreground-secondary"
            )}
          >
            {t(item.labelKey)}
          </Link>
        ))}
    </nav>
  );
}

/** 窄屏折叠菜单：宽度不足以并排展示导航链接时收进下拉 */
function NavMenu({ pathname }: { pathname?: string | null }) {
  const { t } = useLocale();
  const signedIn = useSignedIn();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("nav.menu")}>
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">{t("nav.menu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {navItems
          .filter((item) => !item.requiresAuth || signedIn)
          .map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(`${item.href}/`))
                    ? "font-semibold text-foreground"
                    : "text-foreground-secondary"
                )}
              >
                {t(item.labelKey)}
              </Link>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** usePathname 属于运行时数据，cacheComponents 下需包在 Suspense 内 */
function ActiveNavLinks() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

function ActiveNavMenu() {
  const pathname = usePathname();
  return <NavMenu pathname={pathname} />;
}

export function Navbar({
  siteName = "Sharp",
  logoUrl = null,
}: {
  siteName?: string;
  logoUrl?: string | null;
}) {
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-light bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-[1200px] items-center px-4">
        <div className="flex min-w-0 items-center md:mr-4">
          <Link href="/" className="mr-3 flex shrink-0 items-center space-x-2 md:mr-6">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-7 w-7 object-contain" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {siteName.slice(0, 1).toUpperCase() || "S"}
              </span>
            )}
            <span className="hidden text-xl font-bold text-primary sm:inline">{siteName}</span>
          </Link>
          {/* 断点与答题页答题卡一致（lg）：答题卡并排时完整展示，换行后收进下拉 */}
          <div className="hidden lg:block">
            <Suspense fallback={<NavLinks />}>
              <ActiveNavLinks />
            </Suspense>
          </div>
          <div className="lg:hidden">
            <Suspense fallback={<NavMenu />}>
              <ActiveNavMenu />
            </Suspense>
          </div>
        </div>
        <div className="flex flex-1 shrink-0 items-center justify-end space-x-1 pl-2">
          <ScopeSelector />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Globe className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">
                  {languageOptions.find((o) => o.value === locale)?.label}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languageOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setLocale(option.value)}
                >
                  <span className="flex-1">{option.label}</span>
                  {locale === option.value && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
