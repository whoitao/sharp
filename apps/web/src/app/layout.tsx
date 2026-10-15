import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { LocaleProvider } from "@/lib/i18n";
import { StoreProvider } from "@/store/provider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharp - Modern Learning Platform",
  description: "A modern quiz and vocabulary learning platform built with Next.js and React Native",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <StoreProvider>
          <LocaleProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="container mx-auto w-full max-w-[1200px] flex-1 px-4">
                {children}
              </main>
              <Footer />
            </div>
          </LocaleProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
