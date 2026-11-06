"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/theme";
import { useTheme } from "@/lib/theme";

/**
 * 导航栏快捷主题开关：在浅/深之间切换。
 * 若当前是「跟随系统」，点击后落到与系统相反的一档，保证点击立即有反馈。
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <button className={cn("h-9 w-9", className)} aria-label="theme" />;
  }

  const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label="toggle theme"
      title={theme === "system" ? "system" : theme}
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
