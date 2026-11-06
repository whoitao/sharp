"use client";

import { SettingsForm } from "@/components/account/settings-form";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/profile/use-profile";
import { Loader2 } from "lucide-react";

export default function AccountSettingsPage() {
  const { t } = useLocale();
  const { status, reload } = useSessionProfile("/account/settings");

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

  return <SettingsForm />;
}
