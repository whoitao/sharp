import { AuthPanel } from "@/components/auth/auth-panel";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { buildSiteMetadata, getSiteSettings, siteNameFor } from "@/lib/site-settings";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSiteSettings(), getRequestLocale()]);
  const siteName = siteNameFor(settings, locale);
  return buildSiteMetadata({
    settings,
    locale,
    path: "/login",
    title: locale === "zh" ? `学员登录 · ${siteName}` : `Sign in · ${siteName}`,
    description:
      locale === "zh"
        ? `登录或注册 ${siteName} 学员账号，在 Web 上继续学习。`
        : `Sign in or create a ${siteName} account to continue learning on the web.`,
  });
}

function AuthFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="hidden min-h-[440px] animate-pulse rounded-lg border border-border bg-primary-light lg:block" />
      <div className="mx-auto min-h-[440px] w-full max-w-[440px] animate-pulse rounded-lg border border-border bg-surface card-shadow lg:mx-0 lg:max-w-none" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<AuthFallback />}>
        <AuthPanel />
      </Suspense>
    </div>
  );
}
