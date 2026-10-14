import { AntdProviders } from "@/components/antd-providers";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sharp Admin",
  description: "Admin panel for Sharp quiz app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AntdRegistry>
          <AntdProviders>{children}</AntdProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
