"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { fetchSettings, updateSettings, type AppSettings } from "@/lib/profile/api";
import { useTheme, type Density, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Check, Loader2, Monitor, Moon, Save, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Status = "loading" | "error" | "ready";

const optionBase =
  "inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-semibold transition-colors disabled:opacity-60";
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
  const [unitSize, setUnitSize] = useState("20");
  const [savingUnitSize, setSavingUnitSize] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const load = useCallback(() => {
    setStatus("loading");
    fetchSettings()
      .then((settings) => {
        setUnitSize(String(settings.unitSize));
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
      setFeedback({ tone: "ok", text: t("account.saved") });
    } catch {
      setFeedback({ tone: "error", text: t("account.syncFailed") });
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

  async function handleUnitSizeSave() {
    const next = Number(unitSize);
    if (!Number.isInteger(next) || next < 5 || next > 100) {
      setFeedback({ tone: "error", text: t("account.unitSizeInvalid") });
      return;
    }
    setSavingUnitSize(true);
    await sync({ unitSize: next });
    setSavingUnitSize(false);
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
                  {locale === value && <Check className="h-3.5 w-3.5" />}
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

        <div className="px-5 py-5 md:px-6">
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
          <div className="mt-4 rounded-[10px] border border-border-light bg-surface-secondary px-4 py-3">
            <p className="text-xs font-bold text-foreground-tertiary">
              {t("account.densityPreviewTitle")}
            </p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {t("account.densityPreviewBody")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 card-shadow md:p-6">
        <h2 className="text-sm font-bold">{t("account.unitSize")}</h2>
        <p className="mt-1 text-xs text-foreground-secondary">
          {t("account.unitSizeDesc")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              id="settings-unit-size"
              value={unitSize}
              inputMode="numeric"
              onChange={(event) =>
                setUnitSize(event.target.value.replace(/[^\d]/g, "").slice(0, 3))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleUnitSizeSave();
              }}
              className="h-10 w-24 rounded-[10px] border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-sm text-foreground-secondary">
              {t("account.unitSizeUnit")}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={savingUnitSize}
            onClick={handleUnitSizeSave}
          >
            {savingUnitSize ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {savingUnitSize ? t("account.saving") : t("account.save")}
          </Button>
        </div>
      </section>

      {feedback && (
        <p
          className={cn(
            "text-xs font-semibold",
            feedback.tone === "ok" ? "text-primary-strong" : "text-destructive",
          )}
          role="status"
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
