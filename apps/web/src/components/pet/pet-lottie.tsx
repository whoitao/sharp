"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type PetAnimationKind = "idle" | "feed" | "evolve";

type LottiePlayer = {
  loadAnimation: (config: Record<string, unknown>) => {
    destroy: () => void;
    addEventListener: (name: string, callback: () => void) => void;
  };
};

const animationCache = new Map<string, Promise<Record<string, unknown>>>();

/** 同一份动画 JSON 只拉取一次；失败后允许下次重试 */
function loadAnimationData(url: string) {
  const cached = animationCache.get(url);
  if (cached) return cached;
  const promise = fetch(url, { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error(`lottie ${url} ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  });
  animationCache.set(url, promise);
  promise.catch(() => animationCache.delete(url));
  return promise;
}

/**
 * 宠物动画播放器：使用后台配置的 Lottie JSON（与移动端同一批资源）。
 * - idle 循环播放，feed / evolve 播放一次后回调 onFinish；
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onFinishRef = useRef(onFinish);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const url = kind === "feed" ? feedUrl : kind === "evolve" ? evolveUrl : idleUrl;
  const playable = !reducedMotion && !!url;

  useEffect(() => {
    if (!playable || !url) {
      setReady(false);
      return;
    }

    let cancelled = false;
    let instance: ReturnType<LottiePlayer["loadAnimation"]> | null = null;
    setFailed(false);
    setReady(false);

    (async () => {
      const [module, data] = await Promise.all([
        import("lottie-web"),
        loadAnimationData(url),
      ]);
      if (cancelled) return;
      const container = containerRef.current;
      if (!container) return;

      const player = ((module as unknown as { default?: LottiePlayer }).default ??
        (module as unknown as LottiePlayer)) as LottiePlayer;
      container.innerHTML = "";
      instance = player.loadAnimation({
        container,
        renderer: "svg",
        loop: kind === "idle",
        autoplay: true,
        // lottie 会改写传入对象，这里克隆一份，避免缓存复用后动画状态串扰
        animationData: structuredClone(data),
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: true,
          hideOnTransparent: true,
        },
      });
      instance.addEventListener("data_failed", () => {
        if (!cancelled) setFailed(true);
      });
      instance.addEventListener("complete", () => {
        if (!cancelled) onFinishRef.current?.();
      });
      // SVG 节点是在 DOMLoaded 后才插入容器的，等到这时再撤掉静态图，避免中间空一帧
      instance.addEventListener("DOMLoaded", () => {
        if (!cancelled) setReady(true);
      });
    })().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      instance?.destroy();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [playable, url, kind]);

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
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span aria-hidden="true" className="text-[5.5rem] leading-none">
            {fallbackIcon || "🐾"}
          </span>
        ))}
    </div>
  );
}
