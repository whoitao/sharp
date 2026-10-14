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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // SSR 与首次客户端渲染固定为 en，避免 hydration 不一致；
  // 挂载后再根据 localStorage / 浏览器语言切换。
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const initial =
      stored === "zh" || stored === "en"
        ? stored
        : navigator.language.toLowerCase().startsWith("zh")
          ? "zh"
          : "en";
    setLocaleState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
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
