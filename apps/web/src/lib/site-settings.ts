import { API_BASE } from "@/lib/api";
import type { Locale } from "@/lib/i18n/locale";
import type { Metadata } from "next";

/** 站点设置（Web 侧只读白名单字段） */
export interface SiteSettings {
  siteNameZh: string;
  siteNameEn: string;
  sloganZh: string | null;
  sloganEn: string | null;
  siteUrl: string;
  seoTitleZh: string;
  seoTitleEn: string;
  seoDescriptionZh: string;
  seoDescriptionEn: string;
  gaMeasurementId: string | null;
  analyticsProductionOnly: boolean;
  icpNumber: string | null;
}

export const SITE_SETTINGS_TAG = "site-settings";

/**
 * 内置默认值 = 后台未配置/接口异常时的当前线上表现。
 * 文案与改造前的硬编码逐字一致，避免上线过程中出现「配置为空 → 全站文案变化」。
 */
export const DEFAULTS: SiteSettings = {
  siteNameZh: "Sharp",
  siteNameEn: "Sharp",
  sloganZh: null,
  sloganEn: null,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sharp.whoitao.top",
  seoTitleZh: "Sharp - Modern Learning Platform",
  seoTitleEn: "Sharp - Modern Learning Platform",
  seoDescriptionZh:
    "A modern quiz and vocabulary learning platform built with Next.js and React Native",
  seoDescriptionEn:
    "A modern quiz and vocabulary learning platform built with Next.js and React Native",
  gaMeasurementId: null,
  analyticsProductionOnly: true,
  icpNumber: null,
};

const FAVICON_PATH = "/favicon.svg";

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** 合并远端值：缺省/空值回落内置默认，保证永远有可用配置 */
export function mergeSiteSettings(remote: Partial<SiteSettings> | null): SiteSettings {
  if (!remote) return DEFAULTS;
  return {
    siteNameZh: nonEmpty(remote.siteNameZh) ?? DEFAULTS.siteNameZh,
    siteNameEn: nonEmpty(remote.siteNameEn) ?? DEFAULTS.siteNameEn,
    sloganZh: nonEmpty(remote.sloganZh),
    sloganEn: nonEmpty(remote.sloganEn),
    siteUrl: nonEmpty(remote.siteUrl) ?? DEFAULTS.siteUrl,
    seoTitleZh: nonEmpty(remote.seoTitleZh) ?? DEFAULTS.seoTitleZh,
    seoTitleEn: nonEmpty(remote.seoTitleEn) ?? DEFAULTS.seoTitleEn,
    seoDescriptionZh: nonEmpty(remote.seoDescriptionZh) ?? DEFAULTS.seoDescriptionZh,
    seoDescriptionEn: nonEmpty(remote.seoDescriptionEn) ?? DEFAULTS.seoDescriptionEn,
    gaMeasurementId: nonEmpty(remote.gaMeasurementId),
    analyticsProductionOnly:
      typeof remote.analyticsProductionOnly === "boolean"
        ? remote.analyticsProductionOnly
        : DEFAULTS.analyticsProductionOnly,
    icpNumber: nonEmpty(remote.icpNumber),
  };
}

/**
 * 读取站点设置：5 分钟数据缓存 + tag 失效，避免每次请求穿透到 admin/Supabase。
 * 任何异常都回落 DEFAULTS，绝不让整站因配置接口故障白屏。
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/app/site-settings`, {
      next: { revalidate: 300, tags: [SITE_SETTINGS_TAG] },
    });
    if (!res.ok) return DEFAULTS;
    return mergeSiteSettings((await res.json()) as Partial<SiteSettings>);
  } catch {
    return DEFAULTS;
  }
}

export function siteNameFor(settings: SiteSettings, locale: Locale): string {
  return locale === "zh" ? settings.siteNameZh : settings.siteNameEn;
}

export function siteSloganFor(settings: SiteSettings, locale: Locale): string | null {
  return locale === "zh" ? settings.sloganZh : settings.sloganEn;
}

export function seoTitleFor(settings: SiteSettings, locale: Locale): string {
  const configured = locale === "zh" ? settings.seoTitleZh : settings.seoTitleEn;
  return configured || siteNameFor(settings, locale);
}

export function seoDescriptionFor(settings: SiteSettings, locale: Locale): string {
  const configured = locale === "zh" ? settings.seoDescriptionZh : settings.seoDescriptionEn;
  return configured || siteSloganFor(settings, locale) || siteNameFor(settings, locale);
}

function safeBaseUrl(siteUrl: string): URL {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL(DEFAULTS.siteUrl);
  }
}

/**
 * 统一产出页面 metadata：标题/描述/canonical/OG/Twitter/icons。
 * 传入 title/description 时覆盖默认值，path 用于 canonical 与 OG url。
 */
export function buildSiteMetadata({
  settings,
  locale,
  title,
  description,
  path = "/",
}: {
  settings: SiteSettings;
  locale: Locale;
  title?: string;
  description?: string;
  path?: string;
}): Metadata {
  const base = safeBaseUrl(settings.siteUrl);
  const siteName = siteNameFor(settings, locale);
  const finalTitle = title || seoTitleFor(settings, locale);
  const finalDescription = description || seoDescriptionFor(settings, locale);

  return {
    metadataBase: base,
    title: finalTitle,
    description: finalDescription,
    alternates: { canonical: path },
    icons: { icon: FAVICON_PATH },
    openGraph: {
      type: "website",
      siteName,
      title: finalTitle,
      description: finalDescription,
      url: new URL(path, base).toString(),
      locale: locale === "zh" ? "zh_CN" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
    },
  };
}
