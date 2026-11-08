import { ClientStoreProvider } from "@/components/client-store-provider";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { LocaleProvider } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { StudyScopeProvider } from "@/lib/study-scope";
import { ThemeProvider } from "@/lib/theme";
import { themeInitScript } from "@/lib/theme-init";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharp - Modern Learning Platform",
  description: "A modern quiz and vocabulary learning platform built with Next.js and React Native",
};

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
  const locale = await getRequestLocale();
  const htmlLang = locale === "zh" ? "zh-CN" : "en";

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ClientStoreProvider>
          <ThemeProvider>
            <LocaleProvider initialLocale={locale}>
              <StudyScopeProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="container mx-auto w-full max-w-[1200px] flex-1 px-4">
                    {children}
                  </main>
                  <Footer />
                </div>
              </StudyScopeProvider>
            </LocaleProvider>
          </ThemeProvider>
        </ClientStoreProvider>
      </body>
    </html>
  );
}
