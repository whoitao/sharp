"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en, type Messages } from "./en";
import { zh } from "./zh";

export type Locale = "en" | "zh";

const STORAGE_KEY = "web_locale";

const dictionaries: Record<Locale, Messages> = { en, zh };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dict: Messages;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function lookup(messages: Messages, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      messages
    );
  return typeof value === "string" ? value : path;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // 首次挂载读取 localStorage，否则按浏览器语言自动检测
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh") {
      setLocaleState(stored);
      return;
    }
    if (window.navigator.language.toLowerCase().startsWith("zh")) {
      setLocaleState("zh");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      setLocale,
      dict,
      t: (key, params) => {
        let message = lookup(dict, key);
        if (params) {
          for (const [name, val] of Object.entries(params)) {
            message = message.replaceAll(`{${name}}`, String(val));
          }
        }
        return message;
      },
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
