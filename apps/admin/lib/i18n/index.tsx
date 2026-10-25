"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type Messages } from "./en";
import { zh } from "./zh";

export type Locale = "zh" | "en";

const dictionaries: Record<Locale, Messages> = { zh, en };

type FlatKeys<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : FlatKeys<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = FlatKeys<Messages>;

export type MessageVars = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: MessageVars) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export const useLocale = () => useContext(LocaleContext);

const STORAGE_KEY = "admin_locale";

function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  let cur: unknown = dictionaries[locale];
  for (const part of key.split(".")) {
    cur = (cur as Record<string, unknown>)?.[part];
  }
  if (typeof cur !== "string") return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (raw, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : raw
  );
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  /** 服务端按 cookie / Accept-Language 解析的初始语言，避免首屏语言闪烁 */
  initialLocale?: Locale;
}) {
  // 初始语言由服务端下发，SSR 与客户端首次渲染一致，无需挂载后再切换
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "zh");

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // 写 cookie 供服务端下次渲染读取（localStorage 仅做兼容兜底）
    document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000`;
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
