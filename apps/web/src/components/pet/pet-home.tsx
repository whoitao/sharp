"use client";

import { PetMotion } from "@/components/pet/pet-motion";
import type { PetAnimationKind } from "@/components/pet/pet-lottie";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  feedPet,
  getPetFoods,
  getPetHome,
  PetApiError,
  type PetBackpackItem,
  type PetDetail,
  type PetFeedResult,
  type PetHomeData,
} from "@/lib/pet/api";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpCircle,
  BookOpen,
  Check,
  ChevronRight,
  Loader2,
  PawPrint,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LoadStatus = "loading" | "ready" | "error";

/** 喂养记录里只有 foodType，图标优先取背包定义，回落到与移动端一致的默认值 */
const FALLBACK_FOOD_ICON: Record<string, string> = {
  normal: "🍎",
  premium: "🍖",
  rare: "🍰",
};

function ProgressBar({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "warning";
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-border-light", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          tone === "warning" ? "bg-amber-500" : "bg-primary",
        )}
        style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }}
      />
    </div>
  );
}

function StateChip({ state }: { state: PetDetail["state"] }) {
  const { t } = useLocale();
  const config = {
    active: {
      label: t("pet.stateActive"),
      className: "bg-primary-light text-primary-strong",
    },
    normal: {
      label: t("pet.stateNormal"),
      className: "bg-surface-secondary text-foreground-secondary",
    },
    hungry: {
      label: t("pet.stateHungry"),
      className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    asleep: {
      label: t("pet.stateAsleep"),
      className: "bg-border-light text-foreground-tertiary",
    },
  }[state];

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

/**
 * 弹层：390 贴底。
 * - 默认桌面居中（养宠指南）；
 * - drawer 模式在桌面贴右侧，喂食时左侧的宠物动画仍可见。
 * Esc / 点击遮罩关闭。
 */
function Sheet({
  label,
  onClose,
  children,
  drawer = false,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  drawer?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className={cn(
        "fixed inset-0 z-[100] flex bg-black/50",
        drawer
          ? "items-end justify-end sm:items-stretch"
          : "items-end justify-center sm:items-center sm:p-4",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "overflow-y-auto border border-border bg-surface p-4 shadow-xl",
          drawer
            ? "max-h-[88vh] w-full rounded-t-2xl p-4 sm:h-full sm:max-h-none sm:w-[420px] sm:max-w-[420px] sm:rounded-l-2xl sm:rounded-tr-none sm:border-y-0 sm:border-r-0 sm:p-5"
            : "max-h-[88vh] w-full max-w-md rounded-t-2xl sm:rounded-2xl sm:p-5",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PetHome() {
  const { t } = useLocale();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [unauthorized, setUnauthorized] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [home, setHome] = useState<PetHomeData | null>(null);

  const [rulesOpen, setRulesOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [foods, setFoods] = useState<PetBackpackItem[] | null>(null);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feeding, setFeeding] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedResult, setFeedResult] = useState<PetFeedResult | null>(null);
  const [modalSatiety, setModalSatiety] = useState(0);
  const [modalSatietyMax, setModalSatietyMax] = useState(200);

  // 宠物形象动画：idle 常驻循环，喂食 / 进化播放一次后回到 idle
  const [animKind, setAnimKind] = useState<PetAnimationKind>("idle");
  // 本次喂食触发了进化时，等喂食动画播完再切进化动画
  const pendingEvolveRef = useRef(false);

  const loadPet = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await getPetHome();
      setHome(data);
      setUnauthorized(false);
      setStatus("ready");
    } catch (error) {
      setUnauthorized(error instanceof PetApiError && error.status === 401);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadPet();
  }, [loadPet, reloadKey]);

  const refreshHome = useCallback(async () => {
    try {
      setHome(await getPetHome());
    } catch {
      /* 喂食成功后的静默刷新，失败不影响当前弹层结果 */
    }
  }, []);

  /** feed / evolve 播放结束：喂食后若升级阶段则先刷新数据再播进化，否则回到 idle */
  const handleAnimationFinish = useCallback(() => {
    if (animKind === "feed") {
      if (pendingEvolveRef.current) {
        pendingEvolveRef.current = false;
        void refreshHome().then(() => setAnimKind("evolve"));
      } else {
        setAnimKind("idle");
      }
      return;
    }
    if (animKind === "evolve") setAnimKind("idle");
  }, [animKind, refreshHome]);

  // 兜底：动画地址缺失 / 未触发 complete 时，最多停留 6s 必须回到 idle（sleep 是常驻循环，不参与）
  useEffect(() => {
    if (animKind === "idle" || animKind === "sleep") return;
    const timer = window.setTimeout(() => {
      pendingEvolveRef.current = false;
      setAnimKind("idle");
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [animKind]);

  const pet = home?.pet ?? null;
  const backpack = useMemo(() => home?.backpack ?? [], [home]);
  const foodMeta = useMemo(
    () => new Map(backpack.map((item) => [item.foodType, item])),
    [backpack],
  );
  const hasFood = backpack.some((item) => item.quantity > 0);
  const petState = pet?.state ?? null;
  const sleeping = petState === "asleep";
  const rareOwned = backpack.find((item) => item.foodType === "rare")?.quantity ?? 0;

  // 睡眠 / 待机互转：喂食与进化动画播放期间不打断，播完由 handleAnimationFinish 收尾
  useEffect(() => {
    if (!petState) return;
    setAnimKind((current) => {
      if (current !== "idle" && current !== "sleep") return current;
      return petState === "asleep" ? "sleep" : "idle";
    });
  }, [petState]);

  const isMaxLevel =
    !!pet &&
    pet.level >= (pet.route[pet.route.length - 1]?.level ?? pet.level) &&
    pet.expToNext === pet.experience;

  const openFeed = useCallback(async () => {
    if (!pet) return;
    setRulesOpen(false);
    setFeedOpen(true);
    setFeedResult(null);
    setFeedError(null);
    setQuantity(1);
    setModalSatiety(pet.satiety);
    setModalSatietyMax(pet.satietyMax);
    setFoodsLoading(true);
    try {
      const data = await getPetFoods();
      setFoods(data.foods);
      setModalSatiety(data.satiety);
      setModalSatietyMax(data.satietyMax);
      // 睡眠中只允许喂稀有食物，默认选中它；其余状态选第一个有库存的
      const preferred =
        pet.state === "asleep"
          ? data.foods.find((item) => item.foodType === "rare")
          : data.foods.find((item) => item.quantity > 0);
      setSelectedFood(preferred?.foodType ?? data.foods[0]?.foodType ?? null);
    } catch {
      setFoods(home?.backpack ?? []);
      const preferred =
        pet.state === "asleep"
          ? home?.backpack.find((item) => item.foodType === "rare")
          : home?.backpack.find((item) => item.quantity > 0);
      setSelectedFood(preferred?.foodType ?? null);
    } finally {
      setFoodsLoading(false);
    }
  }, [home?.backpack, pet]);

  const closeFeed = useCallback(() => setFeedOpen(false), []);
  const closeRules = useCallback(() => setRulesOpen(false), []);

  const selectedItem = foods?.find((item) => item.foodType === selectedFood) ?? null;
  const owned = selectedItem?.quantity ?? 0;
  // 后端单次最多喂 10 个（与移动端步进器一致）；睡眠中固定 1 个稀有食物
  const maxQuantity = sleeping ? Math.min(1, owned) : Math.min(10, owned);
  const satietyFull = modalSatiety >= modalSatietyMax;
  const drawerRareOwned = foods?.find((item) => item.foodType === "rare")?.quantity ?? 0;

  useEffect(() => {
    if (maxQuantity > 0) {
      setQuantity((current) => Math.min(current, maxQuantity));
    }
  }, [maxQuantity]);

  const handleFeed = async () => {
    if (!selectedFood || feeding) return;
    if (sleeping && selectedFood !== "rare") return;
    const count = Math.min(quantity, maxQuantity);
    if (count < 1) return;

    setFeeding(true);
    setFeedError(null);
    try {
      const result = await feedPet(selectedFood, count);
      setFeedResult(result);
      setModalSatiety(result.satiety);
      setFoods((prev) =>
        prev
          ? prev.map((item) =>
              item.foodType === result.foodType
                ? { ...item, quantity: result.backpack[item.foodType] ?? 0 }
                : item,
            )
          : prev,
      );
      const remaining = result.backpack[result.foodType] ?? 0;
      setQuantity((current) => Math.max(1, Math.min(current, Math.min(10, remaining))));

      // 喂食成功后播喂食动画；进化要等刷出新阶段数据再播，保证用新阶段的动画地址
      pendingEvolveRef.current = result.stageUp && !!result.evolution;
      if (pet?.growthStage.feedLottieUrl) {
        setAnimKind("feed");
        void refreshHome();
      } else if (pendingEvolveRef.current) {
        pendingEvolveRef.current = false;
        void refreshHome().then(() => setAnimKind("evolve"));
      } else {
        void refreshHome();
      }

      // Auto-close feed drawer after brief result display
      window.setTimeout(closeFeed, 1200);
    } catch (error) {
      const code = error instanceof PetApiError ? error.code : null;
      setFeedError(
        code === "SLEEP_LOCKED"
          ? "sleepLocked"
          : code === "PET_FULL"
            ? "petFull"
            : code === "FOOD_NOT_ENOUGH"
              ? "foodNotEnough"
              : "feedFailed",
      );
      // 状态可能已在别处变化：刷新一次，避免弹层还停留在旧的睡眠/清醒判断
      if (code === "SLEEP_LOCKED") void refreshHome();
    } finally {
      setFeeding(false);
    }
  };

  return (
    <div className="pb-6 md:grid md:pb-0">
      {status === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("pet.loading")}
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-6 text-center card-shadow md:h-full">
          <p className="text-sm font-bold">
            {unauthorized ? t("pet.loginTitle") : t("pet.loadErrorTitle")}
          </p>
          <p className="mt-1 text-xs text-foreground-secondary">
            {unauthorized ? t("pet.loginBody") : t("pet.loadErrorBody")}
          </p>
          {unauthorized ? (
            <Button asChild size="sm" className="mt-4">
              <Link href="/login?next=/account/pet">{t("pet.loginCta")}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              {t("pet.retry")}
            </Button>
          )}
        </div>
      ) : !pet ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow md:h-full">
          <PawPrint className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-base font-bold">{t("pet.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-foreground-secondary">
            {t("pet.emptyBody")}
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/account/pet/adopt">
              {t("pet.emptyCta")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* 宽屏两栏：左栏是宠物舞台与今日经验（吸顶），右栏是统计、进化与记录 */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-5">
            <div className="space-y-3 lg:sticky lg:top-[76px]">
              <section className="rounded-xl border border-border bg-surface p-4 card-shadow sm:p-5">
                <div className="relative mx-auto w-full max-w-[280px]">
                  {/* 舞台固定正方形，动画切换不引起布局跳动；虚线框只做视觉容器，绝对定位不参与布局 */}
                  <div className="relative aspect-square w-full p-3">
                    <PetMotion
                      kind={animKind}
                      idleUrl={pet.growthStage.idleLottieUrl}
                      feedUrl={pet.growthStage.feedLottieUrl}
                      evolveUrl={pet.growthStage.evolveLottieUrl}
                      imageUrl={pet.growthStage.imageUrl}
                      sideImageUrl={pet.growthStage.sideImageUrl}
                      manifestUrl={pet.growthStage.motionManifestUrl}
                      fallbackIcon={pet.species.icon}
                      onFinish={handleAnimationFinish}
                      className="h-full w-full"
                    />
                    {/* 与移动端一致：1px 虚线、主题色 45% 透明、透明底；pointer-events 不拦动画 */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-xl border border-dashed"
                      style={{ borderColor: "hsl(var(--primary) / 0.45)" }}
                    />
                  </div>
                </div>

                <div className="mt-4 w-full min-w-0">
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
                    <h2 className="min-w-0 truncate text-[1.375rem] font-bold leading-tight">
                      {pet.nickname} · {t("pet.level", { n: pet.level })}
                    </h2>
                    <StateChip state={pet.state} />
                  </div>
                  <p className="mt-1 truncate text-center text-xs text-foreground-tertiary lg:text-left">
                    {pet.species.name} · {pet.growthStage.name} ·{" "}
                    {t("pet.companionDays", { n: pet.companionDays })}
                  </p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 text-xs text-foreground-secondary">
                      <span className="truncate">
                        {isMaxLevel
                          ? t("pet.maxLevel")
                          : t("pet.expToNext", {
                              n: Math.max(0, pet.expToNext - pet.experience),
                            })}
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground-tertiary">
                        {t("pet.expValue", {
                          current: pet.experience,
                          next: pet.expToNext,
                        })}
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-1.5"
                      value={
                        pet.expToNext > 0 ? pet.experience / pet.expToNext : 1
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-foreground-secondary">
                      <span>{t("pet.satiety")}</span>
                      <span className="shrink-0 tabular-nums text-foreground-tertiary">
                        {t("pet.satietyValue", {
                          satiety: pet.satiety,
                          max: pet.satietyMax,
                        })}
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-1.5"
                      tone="warning"
                      value={
                        pet.satietyMax > 0 ? pet.satiety / pet.satietyMax : 0
                      }
                    />
                    <p className="mt-1 text-xs text-foreground-tertiary">
                      {t("pet.satietyHint", { max: pet.satietyMax })}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      type="button"
                      className="h-11 justify-center rounded-lg border border-primary bg-primary-light text-[15px] font-semibold text-primary-strong shadow-none transition-colors hover:bg-primary/15 active:bg-primary/20 disabled:border-border disabled:bg-border-light disabled:text-foreground-tertiary disabled:opacity-100 sm:flex-1"
                      disabled={!pet.canFeed && !sleeping}
                      onClick={() => void openFeed()}
                    >
                      {t("pet.feed")}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 justify-center rounded-lg border-border bg-surface text-[15px] font-semibold text-foreground shadow-none transition-colors hover:bg-surface-secondary hover:text-foreground active:bg-surface-secondary sm:flex-1"
                    >
                      <Link href="/learn">
                        {t("pet.practice")}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  {sleeping && (
                    <p className="mt-2 text-center text-xs text-foreground-tertiary">
                      {rareOwned > 0 ? t("pet.sleepHint") : t("pet.sleepNoRare")}
                    </p>
                  )}
                  {!hasFood && !sleeping && (
                    <p className="mt-2 text-center text-xs text-foreground-tertiary">
                      {t("pet.backpackEmpty")}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-surface p-4 card-shadow">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-foreground-secondary">
                    {t("pet.todayExp")}
                  </p>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-primary-strong">
                    {t("pet.todayExpValue", {
                      current: home?.today.expGained ?? 0,
                      cap: home?.today.expCap ?? 0,
                    })}
                  </p>
                </div>
                <ProgressBar
                  className="mt-2"
                  value={
                    home && home.today.expCap > 0
                      ? home.today.expGained / home.today.expCap
                      : 0
                  }
                />
                <p className="mt-1.5 text-xs text-foreground-tertiary">
                  {t("pet.remainingExp", { n: home?.today.remainingExp ?? 0 })}
                </p>
              </section>
            </div>

            <div className="space-y-3 lg:space-y-5">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    label: t("pet.totalCorrect"),
                    value: String(home?.stats.totalCorrect ?? 0),
                  },
                  {
                    label: t("pet.totalFeeds"),
                    value: String(home?.stats.feedCount ?? 0),
                  },
                  {
                    label: t("pet.favoriteSubject"),
                    value: home?.stats.favoriteSubject ?? t("pet.noData"),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-xl border border-border bg-surface p-3 card-shadow sm:p-4"
                  >
                    <p className="truncate text-xs text-foreground-tertiary">
                      {item.label}
                    </p>
                    <p className="mt-1 truncate text-base font-bold">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="min-w-0 text-base font-bold">{t("pet.routeTitle")}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setRulesOpen(true)}
                  >
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    {t("pet.rulesOpen")}
                  </Button>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 sm:gap-3">
                  {pet.route.map((stage) => {
                    const active = stage.stageKey === pet.growthStage.key;
                    const past = !active && stage.level <= pet.level;
                    const locked = !active && !past;
                    return (
                      <div
                        key={stage.stageKey}
                        className={cn(
                          "min-w-0 rounded-xl border p-2.5 text-center sm:p-3",
                          active
                            ? "border-primary bg-primary-light card-shadow"
                            : past
                              ? "border-border bg-surface"
                              : "border-border-light bg-surface-secondary/60 opacity-60",
                        )}
                      >
                        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-primary-light sm:h-20 sm:w-20">
                          <span
                            className={cn("text-2xl", locked && "opacity-50")}
                          >
                            {pet.species.icon ?? "🐾"}
                          </span>
                          {stage.imageUrl && (
                            <img
                              src={stage.imageUrl}
                              alt={stage.name}
                              className={cn(
                                "absolute inset-0 h-full w-full object-contain",
                                locked && "opacity-50",
                              )}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>
                        <p
                          className={cn(
                            "mt-1 truncate text-xs sm:text-sm",
                            active
                              ? "font-bold"
                              : past
                                ? "font-semibold"
                                : "font-medium",
                            locked
                              ? "text-foreground-tertiary"
                              : "text-foreground",
                          )}
                        >
                          {stage.name}
                        </p>
                        <p className="mt-0.5 truncate text-[0.625rem] text-foreground-tertiary">
                          {t("pet.level", { n: stage.level })}
                        </p>
                        {past && (
                          <p className="mt-0.5 truncate text-[0.625rem] text-foreground-tertiary">
                            {t("pet.stagePast")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold">{t("pet.recentFeeds")}</h2>
                  <Link
                    href="/account/pet/feeds"
                    className="shrink-0 text-xs font-semibold text-primary-strong transition-colors hover:text-primary"
                  >
                    {t("pet.viewAll")}
                  </Link>
                </div>
                <div className="mt-2.5">
                  {home?.recentFeeds.length === 0 ? (
                    <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-foreground-secondary card-shadow">
                      {t("pet.noFeeds")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {home?.recentFeeds.map((record) => {
                        const meta = foodMeta.get(record.foodType);
                        return (
                          <li
                            key={record.id}
                            className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 card-shadow sm:px-4 sm:py-3"
                          >
                            <span className="shrink-0 text-xl">
                              {meta?.icon ??
                                FALLBACK_FOOD_ICON[record.foodType] ??
                                "🍎"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">
                                {t("pet.gain", {
                                  satiety: record.satietyGain,
                                  exp: record.expGain,
                                })}
                              </span>
                              <span className="mt-0.5 block text-xs text-foreground-tertiary">
                                {record.dateLabel} · ×{record.quantity}
                              </span>
                            </span>
                            {(record.levelUp || record.stageUp) && (
                              <ArrowUpCircle className="h-4 w-4 shrink-0 text-primary-strong" />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {rulesOpen && (
        <Sheet label={t("pet.rulesTitle")} onClose={closeRules}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{t("pet.rulesTitle")}</h2>
            <button
              type="button"
              aria-label={t("pet.close")}
              onClick={closeRules}
              className="rounded-full p-1 text-foreground-secondary transition-colors hover:bg-surface-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ol className="mt-3 space-y-3">
            {[
              { title: t("pet.rule1Title"), body: t("pet.rule1Body") },
              { title: t("pet.rule2Title"), body: t("pet.rule2Body") },
              { title: t("pet.rule3Title"), body: t("pet.rule3Body") },
              { title: t("pet.rule4Title"), body: t("pet.rule4Body") },
              { title: t("pet.rule5Title"), body: t("pet.rule5Body") },
            ].map((item, index) => (
              <li key={item.title} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-strong">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-secondary">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Sheet>
      )}

      {feedOpen && (
        <Sheet label={t("pet.feedTitle")} onClose={closeFeed} drawer>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{t("pet.feedTitle")}</h2>
            <button
              type="button"
              aria-label={t("pet.close")}
              onClick={closeFeed}
              className="rounded-full p-1 text-foreground-secondary transition-colors hover:bg-surface-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {foodsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-foreground-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("pet.loading")}
            </div>
          ) : sleeping && drawerRareOwned < 1 ? (
            <div className="mt-4 rounded-lg border border-primary/25 bg-primary-light px-3 py-3">
              <p className="text-sm font-semibold text-primary-strong">
                {t("pet.sleepTitle")}
              </p>
              <p className="mt-1 text-xs leading-5 text-foreground-secondary">
                {t("pet.sleepNoRare")}
              </p>
              <Link
                href="/learn"
                onClick={closeFeed}
                className="mt-2 inline-flex items-center text-xs font-semibold text-primary-strong transition-colors hover:text-primary"
              >
                {t("pet.practice")}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          ) : !foods || foods.every((item) => item.quantity <= 0) ? (
            <p className="mt-4 rounded-lg bg-surface-secondary/60 px-3 py-4 text-center text-sm text-foreground-secondary">
              {t("pet.backpackEmpty")}
            </p>
          ) : (
            <>
              {sleeping && (
                <p className="mt-3 rounded-lg border border-primary/25 bg-primary-light px-3 py-2 text-xs leading-5 text-primary-strong">
                  {t("pet.sleepBanner")}
                </p>
              )}
              <div className="mt-3 space-y-2">
                {foods.map((item) => {
                  const active = item.foodType === selectedFood;
                  // 睡眠中普通 / 高级食物置灰，只允许选稀有食物
                  const disabled =
                    item.quantity <= 0 || (sleeping && item.foodType !== "rare");
                  return (
                    <button
                      key={item.foodType}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedFood(item.foodType);
                        setQuantity(1);
                        setFeedResult(null);
                        setFeedError(null);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-primary bg-primary-light"
                          : "border-border bg-surface hover:border-primary/40",
                        disabled && "opacity-50",
                      )}
                    >
                      <span className="shrink-0 text-2xl">
                        {item.icon ?? FALLBACK_FOOD_ICON[item.foodType] ?? "🍎"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-foreground-secondary">
                          {t("pet.gain", {
                            satiety: item.satiety,
                            exp: item.exp,
                          })}{" "}
                          · {t("pet.foodOwned", { count: item.quantity })}
                        </span>
                      </span>
                      {active && (
                        <Check className="h-4 w-4 shrink-0 text-primary-strong" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  {t("pet.feedQuantity")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="-"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-base font-bold text-foreground-secondary transition-colors disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="+"
                    disabled={quantity >= maxQuantity}
                    onClick={() =>
                      setQuantity((current) => Math.min(maxQuantity, current + 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-base font-bold text-foreground-secondary transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {satietyFull && (
                <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  {t("pet.satietyFull")}
                </p>
              )}
              {feedError && (
                <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {feedError === "sleepLocked"
                    ? t("pet.sleepLocked")
                    : feedError === "petFull"
                      ? t("pet.petFull")
                      : feedError === "foodNotEnough"
                        ? t("pet.foodNotEnough")
                        : t("pet.feedFailed")}
                </p>
              )}
              {feedResult && (
                <div className="mt-3 rounded-lg border border-primary/25 bg-primary-light px-3 py-2.5">
                  <p className="text-sm font-semibold text-primary-strong">
                    {t("pet.feedSuccess")}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    {t("pet.gain", {
                      satiety: feedResult.satietyGain,
                      exp: feedResult.expGain,
                    })}
                  </p>
                  {feedResult.levelUp && (
                    <p className="mt-0.5 text-xs font-semibold text-primary-strong">
                      {t("pet.levelUp", { level: feedResult.level })}
                    </p>
                  )}
                  {feedResult.stageUp && feedResult.evolution && (
                    <p className="mt-0.5 text-xs font-semibold text-primary-strong">
                      {t("pet.stageUp", { name: feedResult.evolution.name })}
                    </p>
                  )}
                  {feedResult.capped.satiety && (
                    <p className="mt-0.5 text-xs text-foreground-tertiary">
                      {t("pet.cappedSatiety", { n: feedResult.satietyGain })}
                    </p>
                  )}
                  {feedResult.capped.exp && (
                    <p className="mt-0.5 text-xs text-foreground-tertiary">
                      {t("pet.cappedExp")}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                className="mt-4 w-full justify-center"
                disabled={
                  feeding ||
                  !selectedFood ||
                  maxQuantity < 1 ||
                  satietyFull ||
                  (sleeping && selectedFood !== "rare")
                }
                onClick={() => void handleFeed()}
              >
                {feeding && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {feeding ? t("pet.feeding") : t("pet.feed")}
              </Button>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
