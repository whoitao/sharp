"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fetchSettings, updateSettings, type AppSettings } from "@/lib/profile/api";
import { useTheme, type Density, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Status = "loading" | "error" | "ready";

const optionBase =
  "inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors disabled:opacity-60";
const optionActive = "border-primary bg-primary-light text-primary-strong";
const optionIdle = "border-border bg-surface text-foreground-secondary hover:border-primary/40";

/**
 * 设置页：语言 / 主题 / 展示效果 / 每组题量。
 * 语言、主题、展示效果先作用于本机（立即生效），再同步到账号；
 * 每组题量只存在于账号设置，用于 App 与 Web 划分练习单元。
 */
export function SettingsForm() {
  const { t, locale, setLocale } = useLocale();
  const { theme, density, setTheme, setDensity } = useTheme();

  const [status, setStatus] = useState<Status>("loading");
  const [unitSize, setUnitSize] = useState(20);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    fetchSettings()
      .then((settings) => {
        setUnitSize(settings.unitSize);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sync(payload: Partial<AppSettings>) {
    setFeedback(null);
    try {
      await updateSettings(payload);
    } catch {
      setFeedback(t("account.syncFailed"));
    }
  }

  function handleTheme(next: ThemeMode) {
    setTheme(next);
    void sync({ theme: next });
  }

  function handleDensity(next: Density) {
    setDensity(next);
    void sync({ density: next });
  }

  function handleLocale(next: "zh" | "en") {
    setLocale(next);
    void sync({ language: next });
  }

  function handleUnitSize(next: number) {
    setUnitSize(next);
    void sync({ unitSize: next });
  }

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
        <Button variant="outline" size="sm" className="mt-4" onClick={load}>
          {t("account.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface card-shadow">
        <div className="border-b border-border-light px-5 py-5 md:px-6">
          <div className="sm:flex sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-sm font-bold">{t("account.language")}</h2>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("account.languageDesc")}
              </p>
            </div>
            <div className="mt-3 flex gap-2 sm:mt-0">
              {(["zh", "en"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={locale === value}
                  onClick={() => handleLocale(value)}
                  className={cn(
                    optionBase,
                    locale === value ? optionActive : optionIdle,
                  )}
                >
                  {value === "zh"
                    ? t("account.languageZh")
                    : t("account.languageEn")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-border-light px-5 py-5 md:px-6">
          <div className="sm:flex sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-sm font-bold">{t("account.theme")}</h2>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("account.themeDesc")}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
              {(
                [
                  { value: "light", label: t("account.themeLight"), icon: Sun },
                  { value: "dark", label: t("account.themeDark"), icon: Moon },
                  { value: "system", label: t("account.themeSystem"), icon: Monitor },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => handleTheme(value)}
                  className={cn(
                    optionBase,
                    theme === value ? optionActive : optionIdle,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-border-light px-5 py-5 md:px-6">
          <div className="sm:flex sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-sm font-bold">{t("account.density")}</h2>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("account.densityDesc")}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
              {(
                [
                  { value: "compact", label: t("account.densityCompact") },
                  { value: "comfortable", label: t("account.densityComfortable") },
                  { value: "spacious", label: t("account.densitySpacious") },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={density === value}
                  onClick={() => handleDensity(value)}
                  className={cn(
                    optionBase,
                    density === value ? optionActive : optionIdle,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 md:px-6">
          <div className="sm:flex sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-sm font-bold">{t("account.unitSize")}</h2>
              <p className="mt-1 text-xs text-foreground-secondary">
                {t("account.unitSizeDesc")}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
              {[20, 30, 50, 100].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={unitSize === value}
                  onClick={() => handleUnitSize(value)}
                  className={cn(
                    optionBase,
                    "min-w-12 justify-center",
                    unitSize === value ? optionActive : optionIdle,
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <p className="text-xs font-semibold text-destructive" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
