import { AntdProviders } from "@/components/antd-providers";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import "./globals.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sharp Admin",
  description: "Admin panel for Sharp quiz app",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端解析语言，让首屏 HTML 直接按用户语言渲染，避免先英文后中文的闪烁。
  // 优先级：cookie > Accept-Language > 默认中文
  const cookieStore = await cookies();
  const headerList = await headers();
  const cookieLocale = cookieStore.get("admin_locale")?.value;
  const acceptLang = (headerList.get("accept-language") ?? "").toLowerCase();
  const initialLocale: "zh" | "en" =
    cookieLocale === "zh" || cookieLocale === "en"
      ? cookieLocale
      : acceptLang.startsWith("zh")
        ? "zh"
        : "en";

  return (
    <html lang={initialLocale === "zh" ? "zh-CN" : "en"}>
      <body className={inter.className}>
        {/* cacheComponents 模式下 AntdRegistry 预渲染时会调用 Math.random() 生成样式缓存键，
            会被 Next 16 拦截；包一层 Suspense 让它转为流式渲染（管理后台无需静态预渲染） */}
        <Suspense>
          <AntdRegistry>
            <AntdProviders initialLocale={initialLocale}>{children}</AntdProviders>
          </AntdRegistry>
        </Suspense>
      </body>
    </html>
  );
}
