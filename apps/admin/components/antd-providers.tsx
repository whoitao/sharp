"use client";

import { LocaleProvider, useLocale } from "@/lib/i18n";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** 实际生效的主题（system 解析后） */
  resolved: ResolvedTheme;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: "system",
  setMode: () => {},
  resolved: "light",
});

export const useThemeMode = () => useContext(ThemeModeContext);

/** 用户偏好（light/dark/system）存在 localStorage */
const STORAGE_KEY = "admin_theme";

/** 解析后的结果存 cookie：服务端据此直出对应主题的样式，避免深色用户先看到一帧浅色 */
export const RESOLVED_THEME_COOKIE = "admin_theme";

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

const resolveMode = (mode: ThemeMode): ResolvedTheme => {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const persistResolved = (value: ResolvedTheme) => {
  document.cookie = `${RESOLVED_THEME_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
};

/** 同步根节点：data-theme 决定 globals.css 的底色，colorScheme 让滚动条/原生控件跟着变 */
const applyThemeToDocument = (value: ResolvedTheme) => {
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;
};

// 深色下 antd 默认的派生色偏暗（选中项 #1668dc on #15325b 只有 2.47:1），这里显式抬高文字色
const DARK_TEXT_ON_PRIMARY_BG = "#69b1ff";
const PRIMARY_BG_DARK = "rgba(64,150,255,0.16)";
const PRIMARY_BG_LIGHT = "#e6f4ff";

function ConfiguredApp({
  children,
  initialResolved,
}: {
  children: React.ReactNode;
  initialResolved: ResolvedTheme;
}) {
  const { locale } = useLocale();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>(initialResolved);
  const [pageSize, setPageSizeState] = useState<PageSize>(10);
  const [mounted, setMounted] = useState(false);
  const previousResolved = useRef<ResolvedTheme>(initialResolved);
  const hydratedTheme = useRef(false);
  const [veil, setVeil] = useState<ResolvedTheme | null>(null);

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
      const next = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      if (!hydratedTheme.current) {
        // 首次对齐：直接换成正确主题，不走过渡（cookie 过期时不额外闪一下遮罩）
        hydratedTheme.current = true;
        previousResolved.current = next;
        applyThemeToDocument(next);
      }
      setResolved(next);
      persistResolved(next);
    };
    apply();
    if (mode === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [mode, mounted]);

  // 主题真正变化时才铺一层旧底色淡出，避免整屏颜色一帧硬切
  useEffect(() => {
    if (previousResolved.current === resolved) return;
    const previous = previousResolved.current;
    previousResolved.current = resolved;
    applyThemeToDocument(resolved);
    setVeil(previous);
    const timer = setTimeout(() => setVeil(null), 240);
    return () => clearTimeout(timer);
  }, [resolved]);

  const themeValue = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolved,
      setMode: (next: ThemeMode) => {
        setModeState(next);
        localStorage.setItem(STORAGE_KEY, next);
        const value = resolveMode(next);
        setResolved(value);
        persistResolved(value);
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

  const isDarkTheme = resolved === "dark";

  const themeConfig = useMemo(
    () => ({
      algorithm: isDarkTheme ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        // 深色下 #1677ff 对 #141414 只有 4.5:1 且文字场景更差，抬到 #4096ff
        colorPrimary: isDarkTheme ? "#4096ff" : "#1677ff",
        borderRadius: 8,
        colorLink: isDarkTheme ? "#69b1ff" : "#0958d9",
        colorSuccessText: isDarkTheme ? "#95de64" : "#237804",
        colorErrorText: isDarkTheme ? "#ff7875" : "#cf1322",
      },
      components: {
        Menu: {
          itemSelectedColor: isDarkTheme ? DARK_TEXT_ON_PRIMARY_BG : "#0958d9",
          itemSelectedBg: isDarkTheme ? PRIMARY_BG_DARK : PRIMARY_BG_LIGHT,
        },
      },
    }),
    [isDarkTheme]
  );

  return (
    <ConfigProvider locale={locale === "zh" ? zhCN : enUS} theme={themeConfig}>
      <AntdApp>
        <ThemeModeContext.Provider value={themeValue}>
          <PageSizeContext.Provider value={pageSizeValue}>
            {children}
            {veil && <div className={`theme-veil theme-veil--${veil}`} />}
          </PageSizeContext.Provider>
        </ThemeModeContext.Provider>
      </AntdApp>
    </ConfigProvider>
  );
}

export function AntdProviders({
  children,
  initialLocale,
  initialTheme = "light",
}: {
  children: React.ReactNode;
  /** 服务端解析出的初始语言，保证首屏渲染语言与用户设置一致 */
  initialLocale?: "zh" | "en";
  /** 服务端从 cookie 读到的主题，保证深色用户首屏就是深色 */
  initialTheme?: ResolvedTheme;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <ConfiguredApp initialResolved={initialTheme}>{children}</ConfiguredApp>
    </LocaleProvider>
  );
}
