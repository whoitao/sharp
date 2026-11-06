import { AuthPanel } from "@/components/auth/auth-panel";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "学员登录 · Sharp",
  description: "登录或注册 Sharp 学员账号，在 Web 上继续学习。",
};

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
