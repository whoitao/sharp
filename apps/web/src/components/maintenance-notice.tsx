import type { Locale } from "@/lib/i18n/locale";
import {
  MAINTENANCE_LABEL,
  maintenanceMessageFor,
  siteNameFor,
  type SiteSettings,
} from "@/lib/site-settings";

/**
 * 站点维护通知页。
 * 纯展示组件，由根布局在维护开关生效时直接渲染，替换正常页面内容。
 * Logo 使用站点既有的 /favicon.svg（站点设置模型目前没有独立的 logo 字段）。
 */
export function MaintenanceNotice({
  settings,
  locale,
}: {
  settings: SiteSettings;
  locale: Locale;
}) {
  const siteName = siteNameFor(settings, locale);
  const message = maintenanceMessageFor(settings, locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon.svg"
          alt={siteName}
          width={56}
          height={56}
          className="mx-auto h-14 w-14"
        />
        <p className="mt-5 text-xs font-medium tracking-[0.2em] text-primary">
          {MAINTENANCE_LABEL[locale]}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{siteName}</h1>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground-secondary">
          {message}
        </p>
      </div>
    </div>
  );
}
