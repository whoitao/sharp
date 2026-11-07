"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  getPetFeeds,
  getPetFoods,
  PetApiError,
  type PetFeedRecord,
} from "@/lib/pet/api";
import { ArrowLeft, ArrowUpCircle, Loader2, Utensils } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type LoadStatus = "loading" | "ready" | "error";

const FALLBACK_FOOD_ICON: Record<string, string> = {
  normal: "🍎",
  premium: "🍖",
  rare: "🍰",
};

export function PetFeeds() {
  const { t } = useLocale();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [unauthorized, setUnauthorized] = useState(false);
  const [items, setItems] = useState<PetFeedRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [foodIcons, setFoodIcons] = useState<Record<string, string>>({});

  const load = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setStatus("loading");
    try {
      const data = await getPetFeeds(targetPage);
      setItems((prev) => (append ? [...prev, ...data.data] : data.data));
      setPage(data.page);
      setTotalPages(data.totalPages);
      setUnauthorized(false);
      setStatus("ready");
    } catch (error) {
      if (!append) {
        setUnauthorized(error instanceof PetApiError && error.status === 401);
        setStatus("error");
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  useEffect(() => {
    let alive = true;
    getPetFoods()
      .then((data) => {
        if (!alive) return;
        setFoodIcons(
          Object.fromEntries(
            data.foods
              .filter((item) => item.icon)
              .map((item) => [item.foodType, item.icon as string]),
          ),
        );
      })
      .catch(() => {
        /* 图标映射失败时使用默认图标 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const iconFor = useMemo(
    () => (foodType: string) =>
      foodIcons[foodType] ?? FALLBACK_FOOD_ICON[foodType] ?? "🍎",
    [foodIcons],
  );

  return (
    <div className="pb-6 md:pb-8">
      <Link
        href="/account/pet"
        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("pet.backToPet")}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("pet.feedsTitle")}</h1>
        <p className="mt-1 text-xs text-foreground-secondary sm:text-sm">
          {t("pet.feedsHint")}
        </p>
      </header>

      <div className="mt-5">
        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("pet.loading")}
          </div>
        ) : status === "error" ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center card-shadow">
            <p className="text-sm font-bold">
              {unauthorized ? t("pet.loginTitle") : t("pet.feedsLoadFailed")}
            </p>
            <p className="mt-1 text-xs text-foreground-secondary">
              {unauthorized ? t("pet.loginBody") : t("pet.loadErrorBody")}
            </p>
            {unauthorized ? (
              <Button asChild size="sm" className="mt-4">
                <Link href="/login?next=/account/pet/feeds">{t("pet.loginCta")}</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void load(1, false)}
              >
                {t("pet.retry")}
              </Button>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
            <Utensils className="mx-auto h-9 w-9 text-foreground-tertiary" />
            <p className="mt-3 text-sm font-bold">{t("pet.noFeeds")}</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {items.map((record) => (
                <li
                  key={record.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 card-shadow"
                >
                  <span className="shrink-0 text-2xl">{iconFor(record.foodType)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t("pet.gain", {
                        satiety: record.satietyGain,
                        exp: record.expGain,
                      })}
                    </p>
                    <p className="mt-0.5 truncate text-[0.6875rem] text-foreground-tertiary">
                      {record.dateLabel} · ×{record.quantity}
                    </p>
                  </div>
                  {(record.levelUp || record.stageUp) && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[0.625rem] font-semibold text-primary-strong">
                      <ArrowUpCircle className="h-3 w-3" />
                      {record.stageUp
                        ? t("pet.stageUpShort")
                        : t("pet.levelUpShort")}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {page < totalPages && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void load(page + 1, true)}
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("pet.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
