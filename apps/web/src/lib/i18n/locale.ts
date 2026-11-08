export type Locale = "en" | "zh";

/** 语言偏好的本地存储键与 Cookie 名保持一致，便于互相迁移 */
export const LOCALE_STORAGE_KEY = "web_locale";
export const LOCALE_COOKIE = "web_locale";

export function normalizeLocale(value: string | null | undefined): Locale | null {
  return value === "en" || value === "zh" ? value : null;
}

/** 从 Accept-Language 推断语言，与原先 navigator.language 的判定保持一致 */
export function localeFromAcceptLanguage(acceptLanguage: string | null): Locale {
  return acceptLanguage?.trim().toLowerCase().startsWith("zh") ? "zh" : "en";
}

/** 写入语言 Cookie：服务端首屏读取它，避免刷新时先英文后中文 */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
