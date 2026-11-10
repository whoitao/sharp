"use client";

import {
  createLottieAnimation,
  loadAnimationData,
  loadLottiePlayer,
  type LottieInstance,
} from "@/components/pet/pet-lottie-loader";
import { useEffect, useRef, useState, type RefObject } from "react";

/** 跟随系统「减少动态效果」设置：开启时只展示静态图，不加载动画 */
export function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export interface LottiePlayerOptions {
  /** 动画 JSON 地址；为空时不创建播放器 */
  url?: string | null;
  /** 是否循环播放，feed / evolve 传 false */
  loop?: boolean;
  /** 是否允许加载，prefers-reduced-motion 时传 false */
  enabled?: boolean;
  /** 当前层是否需要播放；双层常驻时用来暂停不可见层 */
  active?: boolean;
  /** 单次动画播放结束回调 */
  onComplete?: () => void;
}

export interface LottiePlayerState {
  containerRef: RefObject<HTMLDivElement | null>;
  /** 首帧已经插入 DOM，可以撤掉静态图了 */
  ready: boolean;
  /** 加载 / 解析失败 */
  failed: boolean;
}

/**
 * 管理单个 Lottie 播放器：加载 JSON、创建 / 销毁实例、控制播放状态。
 * 容器与静态兜底图由调用方渲染，这里只负责播放器本身。
 */
export function useLottiePlayer({
  url,
  loop = true,
  enabled = true,
  active = true,
  onComplete,
}: LottiePlayerOptions): LottiePlayerState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<LottieInstance | null>(null);
  const activeRef = useRef(active);
  const onCompleteRef = useRef(onComplete);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const playable = enabled && !!url;

  useEffect(() => {
    if (!playable || !url) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setFailed(false);
    setReady(false);

    (async () => {
      const [player, data] = await Promise.all([
        loadLottiePlayer(),
        loadAnimationData(url),
      ]);
      if (cancelled) return;
      const container = containerRef.current;
      if (!container) return;

      instanceRef.current = createLottieAnimation(player, {
        container,
        data,
        loop,
        onFailed: () => {
          if (!cancelled) setFailed(true);
        },
        onComplete: () => {
          if (!cancelled) onCompleteRef.current?.();
        },
        // SVG 节点是在 DOMLoaded 后才插入容器的，等到这时再撤掉静态图，避免中间空一帧
        onLoaded: () => {
          if (!cancelled) setReady(true);
        },
      });
      if (activeRef.current) instanceRef.current.play();
      else instanceRef.current.pause();
    })().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [playable, url, loop]);

  // 只让可见的一层在播，避免两个 Lottie 常驻解码抢帧
  useEffect(() => {
    activeRef.current = active;
    const instance = instanceRef.current;
    if (!instance) return;
    if (active) instance.play();
    else instance.pause();
  }, [active, ready]);

  return { containerRef, ready, failed };
}
