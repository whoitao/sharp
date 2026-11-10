import { HomeContent } from "@/components/home-content";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { buildSiteMetadata, getSiteSettings } from "@/lib/site-settings";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSiteSettings(), getRequestLocale()]);
  return buildSiteMetadata({ settings, locale, path: "/" });
}

export default function Home() {
  return <HomeContent />;
}
