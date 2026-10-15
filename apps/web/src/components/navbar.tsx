"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", labelKey: "nav.home" },
  { href: "/docs", labelKey: "nav.docs" },
  { href: "/about", labelKey: "nav.about" },
];

const languageOptions: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

export function Navbar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-[1200px] items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl text-primary">Sharp</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Globe className="mr-1 h-4 w-4" />
                {languageOptions.find((o) => o.value === locale)?.label}
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
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://github.com/whoitao/sharp"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("nav.github")}
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
