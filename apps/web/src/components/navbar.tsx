"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
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
import { Check, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const navItems = [
  { href: "/", labelKey: "nav.home" },
  { href: "/learn", labelKey: "nav.learn", requiresAuth: true },
  { href: "/pet", labelKey: "nav.pet", requiresAuth: true },
  { href: "/articles", labelKey: "nav.articles" },
  { href: "/docs", labelKey: "nav.docs" },
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
    <nav className="flex items-center space-x-3 whitespace-nowrap text-[13px] font-medium sm:space-x-4 md:space-x-6 md:text-sm">
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

/** usePathname 属于运行时数据，cacheComponents 下需包在 Suspense 内 */
function ActiveNavLinks() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

export function Navbar() {
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-light bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-[1200px] items-center px-4">
        <div className="flex min-w-0 items-center md:mr-4">
          <Link href="/" className="mr-3 flex shrink-0 items-center space-x-2 md:mr-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span className="hidden text-xl font-bold text-primary sm:inline">Sharp</span>
          </Link>
          <div className="min-w-0 overflow-x-auto">
            <Suspense fallback={<NavLinks />}>
              <ActiveNavLinks />
            </Suspense>
          </div>
        </div>
        <div className="flex flex-1 shrink-0 items-center justify-end space-x-1 pl-2">
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
