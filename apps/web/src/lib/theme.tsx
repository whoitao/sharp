"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable" | "spacious";

/** 与 theme-init.ts 共用同一组 localStorage key，保证首屏与运行时一致 */
export const THEME_STORAGE_KEY = "theme";
export const DENSITY_STORAGE_KEY = "density";

interface ThemeContextValue {
  /** 用户选择：light / dark / system */
  theme: ThemeMode;
  /** 实际生效的主题（system 解析后的结果） */
  resolvedTheme: "light" | "dark";
  density: Density;
  setTheme: (mode: ThemeMode) => void;
  setDensity: (value: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function readStoredDensity(): Density {
  const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return stored === "compact" || stored === "spacious" || stored === "comfortable"
    ? stored
    : "comfortable";
}

/**
 * 主题与展示效果（信息密度）的唯一来源。
 * 首屏由 theme-init.ts 提前写入 class / data-density，这里挂载后接管运行时的修改。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [density, setDensityState] = useState<Density>("comfortable");
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setDensityState(readStoredDensity());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    setMounted(true);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.density = density;
  }, [density, mounted]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const setDensity = useCallback((value: Density) => {
    setDensityState(value);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, value);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, density, setTheme, setDensity }),
    [theme, resolvedTheme, density, setTheme, setDensity],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
