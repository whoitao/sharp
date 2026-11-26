"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/theme";
import { useTheme } from "@/lib/theme";

/**
 * 导航栏快捷主题开关：在浅/深之间切换。
 * 若当前是「跟随系统」，点击后落到与系统相反的一档，保证点击立即有反馈。
 */
export function ThemeToggle({
  className,
  onChange,
}: {
  className?: string;
  onChange?: (theme: ThemeMode) => void;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className={cn("h-7 w-14 rounded-full bg-surface-secondary", className)}
        aria-label="toggle theme"
      />
    );
  }

  const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="toggle theme"
      aria-pressed={isDark}
      title={theme === "system" ? "system" : theme}
      onClick={() => (onChange ?? setTheme)(next)}
      className={cn(
        "relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border border-border-light bg-surface-secondary shadow-inner transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          isDark ? "translate-x-7" : "translate-x-0",
        )}
      />
      <Sun
        aria-hidden
        className={cn(
          "absolute left-[7px] h-3.5 w-3.5 transition-colors",
          isDark ? "text-foreground-tertiary" : "text-amber-500",
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "absolute right-[7px] h-3.5 w-3.5 transition-colors",
          isDark ? "text-primary" : "text-foreground-tertiary",
        )}
      />
    </button>
  );
}
