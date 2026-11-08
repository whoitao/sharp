import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  normalizeLocale,
  type Locale,
} from "./locale";

/**
 * 服务端读取请求语言：优先用户显式选择的 Cookie，其次浏览器 Accept-Language。
 * 首屏直接按该值渲染，浏览器端不再需要挂载后切换语言。
 */
export async function getRequestLocale(): Promise<Locale> {
  const stored = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if (stored) return stored;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}
