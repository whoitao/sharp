"use client";

import { useLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const languageOptions: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

export function LanguageToggle({
  className,
  onChange,
  side = "bottom",
}: {
  className?: string;
  onChange?: (locale: Locale) => void;
  side?: "top" | "bottom";
}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={languageOptions.find((option) => option.value === locale)?.label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-primary/70 px-2.5 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          className,
        )}
      >
        <Globe className="h-4 w-4" />
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            side === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {languageOptions.map((option) => (
            <button
              key={option.value}
              role="menuitem"
              type="button"
              onClick={() => {
                (onChange ?? setLocale)(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                locale === option.value && "font-medium",
              )}
            >
              <span className="flex-1 text-left">{option.label}</span>
              {locale === option.value && <Check className="ml-2 h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
