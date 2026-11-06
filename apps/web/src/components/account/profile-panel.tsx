"use client";

import { ProfileForm } from "@/components/account/profile-form";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/profile/use-profile";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

/** 个人信息面板：默认 tab 的内容，/account 与 /account/profile 共用 */
export function ProfilePanel() {
  const { t } = useLocale();
  const pathname = usePathname();
  const { profile, setProfile, status, reload } = useSessionProfile(
    pathname || "/account",
  );

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("account.loading")}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
        <p className="text-sm font-semibold">{t("account.loadErrorTitle")}</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {t("account.loadErrorBody")}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={reload}>
          {t("account.retry")}
        </Button>
      </div>
    );
  }

  if (!profile) return null;

  return <ProfileForm profile={profile} onProfileChange={setProfile} />;
}
