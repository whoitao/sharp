"use client";

import { LocaleProvider, useLocale } from "@/lib/i18n";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** 实际生效的主题（system 解析后） */
  resolved: "light" | "dark";
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: "system",
  setMode: () => {},
  resolved: "light",
});

export const useThemeMode = () => useContext(ThemeModeContext);

const STORAGE_KEY = "admin_theme";

export type PageSize = 10 | 20 | 50 | 100;

export const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 50, 100];

const PAGE_SIZE_STORAGE_KEY = "admin_page_size";

interface PageSizeContextValue {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
}

const PageSizeContext = createContext<PageSizeContextValue>({
  pageSize: 10,
  setPageSize: () => {},
});

export const usePageSize = () => useContext(PageSizeContext);

function ConfiguredApp({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [pageSize, setPageSizeState] = useState<PageSize>(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || "system";
    setModeState(stored);
    const storedSize = parseInt(localStorage.getItem(PAGE_SIZE_STORAGE_KEY) ?? "10", 10);
    if (PAGE_SIZE_OPTIONS.includes(storedSize as PageSize)) {
      setPageSizeState(storedSize as PageSize);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      setResolved(mode === "system" ? (media.matches ? "dark" : "light") : mode);
    };
    apply();
    if (mode === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [mode, mounted]);

  const themeValue = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolved,
      setMode: (next: ThemeMode) => {
        setModeState(next);
        localStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [mode, resolved]
  );

  const pageSizeValue = useMemo<PageSizeContextValue>(
    () => ({
      pageSize,
      setPageSize: (next: PageSize) => {
        setPageSizeState(next);
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(next));
      },
    }),
    [pageSize]
  );

  return (
    <ConfigProvider
      locale={locale === "zh" ? zhCN : enUS}
      theme={{
        algorithm: resolved === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <ThemeModeContext.Provider value={themeValue}>
          <PageSizeContext.Provider value={pageSizeValue}>{children}</PageSizeContext.Provider>
        </ThemeModeContext.Provider>
      </AntdApp>
    </ConfigProvider>
  );
}

export function AntdProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <ConfiguredApp>{children}</ConfiguredApp>
    </LocaleProvider>
  );
}
