import { ClientStoreProvider } from "@/components/client-store-provider";
import { Footer } from "@/components/footer";
import { MaintenanceNotice } from "@/components/maintenance-notice";
import { Navbar } from "@/components/navbar";
import { LocaleProvider } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import {
  buildSiteMetadata,
  getSiteSettings,
  isMaintenanceActive,
  siteNameFor,
} from "@/lib/site-settings";
import { StudyScopeProvider } from "@/lib/study-scope";
import { ThemeProvider } from "@/lib/theme";
import { themeInitScript } from "@/lib/theme-init";
import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/** metadata 依赖站点设置与请求语言，按请求生成（项目已关闭 static shell） */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getSiteSettings(), getRequestLocale()]);
  const metadata = buildSiteMetadata({ settings, locale });
  // 维护期间所有 Web 页面都不允许被搜索引擎收录
  if (isMaintenanceActive(settings)) {
    return { ...metadata, robots: { index: false, follow: false } };
  }
  return metadata;
}

/**
 * 首屏语言依赖请求 Cookie，属于运行时数据。
 * 关闭 static shell 预渲染，让服务端按请求语言直接产出 HTML，
 * 避免先输出默认语言的占位再被替换（即多语言闪烁）。
 */
export const instant = false;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 首屏语言在服务端确定：优先用户选择（Cookie），其次浏览器 Accept-Language
  const [locale, settings] = await Promise.all([getRequestLocale(), getSiteSettings()]);
  const htmlLang = locale === "zh" ? "zh-CN" : "en";
  const siteName = siteNameFor(settings, locale);
  // 「仅生产环境生效」开启时，开发环境不注入统计脚本
  const gaEnabled =
    !!settings.gaMeasurementId &&
    (!settings.analyticsProductionOnly || process.env.NODE_ENV === "production");
  const gaId = JSON.stringify(settings.gaMeasurementId ?? "");
  // 维护开关生效时，整站页面内容替换为维护通知；/api/** 与 robots/sitemap 不走布局，不受影响
  const maintenance = isMaintenanceActive(settings);

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {gaEnabled && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', ${gaId});`,
              }}
            />
          </>
        )}
        {maintenance ? (
          <MaintenanceNotice settings={settings} locale={locale} />
        ) : (
          <ClientStoreProvider>
            <ThemeProvider>
              <LocaleProvider initialLocale={locale}>
                <StudyScopeProvider>
                  <div className="flex min-h-screen flex-col">
                    <Navbar siteName={siteName} />
                    <main className="container mx-auto w-full max-w-[1200px] flex-1 px-4">
                      {children}
                    </main>
                    <Footer
                      siteName={siteName}
                      siteUrl={settings.siteUrl}
                      icpNumber={settings.icpNumber}
                    />
                  </div>
                </StudyScopeProvider>
              </LocaleProvider>
            </ThemeProvider>
          </ClientStoreProvider>
        )}
        {/* Vercel Web Analytics：仅生产环境上报，与站点「仅生产环境生效」开关语义一致 */}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
