"use client";

import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import SiteSettingsPanel from "./SiteSettingsPanel";

export default function SiteSettingsPage() {
  const { t } = useLocale();
  usePageTitle(t("siteSettings.title"));

  return <SiteSettingsPanel />;
}
