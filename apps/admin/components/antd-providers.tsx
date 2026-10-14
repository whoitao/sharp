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

function ConfiguredApp({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || "system";
    setModeState(stored);
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

  const value = useMemo<ThemeModeContextValue>(
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
        <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
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
