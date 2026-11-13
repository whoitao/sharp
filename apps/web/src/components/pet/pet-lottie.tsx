"use client";

import { prefetchAnimationData } from "@/components/pet/pet-lottie-loader";
import {
  useLottiePlayer,
  usePrefersReducedMotion,
} from "@/components/pet/use-lottie-player";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type PetAnimationKind = "idle" | "feed" | "evolve" | "sleep";

/**
 * 宠物动画播放器：使用后台配置的 Lottie JSON（与移动端同一批资源）。
 * - idle 循环播放，feed / evolve 播放一次后回调 onFinish；
 * - idle 播放时预取 feed / evolve 的 JSON，避免首次播放现拉；
 * - 尊重 prefers-reduced-motion：开启时直接展示静态形象，不加载动画；
 * - 地址缺失、加载失败或环境不支持时回落到静态图 / emoji 占位。
 */
export function PetLottie({
  kind,
  idleUrl,
  feedUrl,
  evolveUrl,
  imageUrl,
  fallbackIcon,
  onFinish,
  className,
}: {
  kind: PetAnimationKind;
  idleUrl?: string | null;
  feedUrl?: string | null;
  evolveUrl?: string | null;
  imageUrl?: string | null;
  fallbackIcon?: string | null;
  onFinish?: () => void;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const url = kind === "feed" ? feedUrl : kind === "evolve" ? evolveUrl : idleUrl;
  const playable = !reducedMotion && !!url;

  const { containerRef, ready, failed } = useLottiePlayer({
    url,
    loop: kind === "idle" || kind === "sleep",
    // 没有专属睡眠动作时复用 idle，降速模拟呼吸
    speed: kind === "sleep" ? 0.45 : 1,
    enabled: playable,
    onComplete: onFinish,
  });

  // idle 播起来之后再预取后续动作，避免和首屏动画抢带宽
  useEffect(() => {
    if (kind !== "idle" || !ready) return;
    prefetchAnimationData([feedUrl, evolveUrl]);
  }, [kind, ready, feedUrl, evolveUrl]);

  const showLottie = playable && !failed && ready;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div
        ref={containerRef}
        aria-hidden="true"
        className={cn("absolute inset-0", !showLottie && "hidden")}
      />
      {!showLottie &&
        (imageUrl && !imageFailed ? (
          // 宠物形象来自后台配置的公共存储，域名随环境变化，使用原生 img
          <img
            src={imageUrl}
            alt=""
            className={cn("h-full w-full object-contain", kind === "sleep" && "pet-breathe")}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn("text-[5.5rem] leading-none", kind === "sleep" && "pet-breathe")}
          >
            {fallbackIcon || "🐾"}
          </span>
        ))}
    </div>
  );
}
