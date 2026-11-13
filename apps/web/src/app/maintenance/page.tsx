import { MaintenanceNotice } from "@/components/maintenance-notice";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getSiteSettings } from "@/lib/site-settings";
import type { Metadata } from "next";

/** 维护页固定地址：维护开启时任意路径都由根布局渲染同一内容；关闭时可直接访问做预览 */
export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const [settings, locale] = await Promise.all([getSiteSettings(), getRequestLocale()]);
  return <MaintenanceNotice settings={settings} locale={locale} />;
}
