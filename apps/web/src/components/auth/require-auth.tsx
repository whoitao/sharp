"use client";

import { useLocale } from "@/lib/i18n";
import { useStudyScope } from "@/lib/study-scope";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * 受保护页面的统一登录校验：未登录（含手动输入地址）自动跳登录页，
 * 并带上当前地址作为回跳参数。登录态复用全局 StudyScopeProvider，
 * 不额外发请求。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const { ready, signedIn } = useStudyScope();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || signedIn) return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, signedIn, pathname, router]);

  if (!ready || !signedIn) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("account.loading")}
      </div>
    );
  }

  return <>{children}</>;
}
