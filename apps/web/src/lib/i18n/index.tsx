"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en, type Messages } from "./en";
import {
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  writeLocaleCookie,
  type Locale,
} from "./locale";
import { zh } from "./zh";

export type { Locale } from "./locale";

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

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  /** 服务端按 Cookie / Accept-Language 解析出的语言，保证首屏与 SSR 一致 */
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  /**
   * 首屏语言已由服务端决定，这里只做 localStorage 与 Cookie 的迁移/校正：
   * - 两者一致（正常情况）：不做任何切换，首屏不会闪
   * - 老用户只存了 localStorage：补写 Cookie，并以 localStorage 为准（仅一次性迁移）
   * - 都没有：把服务端推断出的语言写回本地，之后刷新即为首屏正确语言
   */
  useEffect(() => {
    const stored = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) {
      writeLocaleCookie(stored);
      if (stored !== initialLocale) setLocaleState(stored);
      return;
    }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale);
    writeLocaleCookie(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    writeLocaleCookie(next);
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
