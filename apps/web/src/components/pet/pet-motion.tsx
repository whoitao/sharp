"use client";

import { PetLottie, type PetAnimationKind } from "@/components/pet/pet-lottie";
import { prefetchAnimationData } from "@/components/pet/pet-lottie-loader";
import {
  useLottiePlayer,
  usePrefersReducedMotion,
} from "@/components/pet/use-lottie-player";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

/** 分层动作包清单（manifest v2）：front 负责原地动作，side 负责横向走动 */
export interface PetMotionManifest {
  version: number;
  front: {
    body: string;
    /** 视觉缩放，用来和侧身形象对齐身高 */
    scale?: number;
    actions: Partial<Record<"idle" | "happy" | "feed" | "evolve" | "sleep", string>>;
  };
  side: {
    body: string;
    /** 侧身图默认朝向，决定镜像方向 */
    facing?: "left" | "right";
    scale?: number;
    /** 走动速度，按 rem/s 计（设计稿 3.6rem/s） */
    walkSpeed?: number;
    actions: Partial<Record<"idle" | "walk", string>>;
  };
}

export interface PetMotionProps {
  manifestUrl?: string | null;
  kind: PetAnimationKind;
  idleUrl?: string | null;
  feedUrl?: string | null;
  evolveUrl?: string | null;
  imageUrl?: string | null;
  sideImageUrl?: string | null;
  fallbackIcon?: string | null;
  onFinish?: () => void;
  className?: string;
}

/** 正 / 侧两层交叉淡化时长 */
const FADE_MS = 120;
/** 转身淡化结束后再留一点余量才起步，避免原地滑步 */
const WALK_START_GAP = 80;
/** 走完保持侧身待机的时间 */
const SIDE_STAND_MS = 600;
/** 宠物本体占舞台短边的比例，剩余空间留给走动（设计稿：走动时约 64%） */
const PET_SIZE_RATIO = 0.64;
/** 左右各 12% 舞台宽作为停止区，也是单次走动的最小距离 */
const SAFE_INSET_RATIO = 0.12;
/** 空闲时触发下一次走动的间隔 */
const WALK_INTERVAL_MIN_MS = 5000;
const WALK_INTERVAL_MAX_MS = 9000;
/** 首次走动前的最短等待 */
const FIRST_WALK_MIN_MS = 3000;
const FIRST_WALK_MAX_MS = 5000;
/** manifest 未配置 walkSpeed 时的默认走速（rem/s） */
const DEFAULT_WALK_SPEED_REM = 3.6;
/** Lottie 不可用时，feed / evolve 兜底回调 onFinish 的延时 */
const FALLBACK_FINISH_MS = 1200;

function isPetMotionManifest(value: unknown): value is PetMotionManifest {
  const manifest = value as Partial<PetMotionManifest> | null;
  if (!manifest || typeof manifest !== "object") return false;
  return (
    typeof manifest.version === "number" &&
    manifest.version >= 2 &&
    !!manifest.front &&
    typeof manifest.front === "object" &&
    !!manifest.front.actions &&
    !!manifest.side &&
    typeof manifest.side === "object" &&
    !!manifest.side.actions
  );
}

/** 睡眠标识：纯 DOM 覆盖层，不依赖 Lottie / 素材，减少动态效果时也保留 */
function SleepZzz() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-2 select-none text-sm font-bold tracking-widest text-foreground-tertiary animate-pulse motion-reduce:animate-none"
    >
      Zzz
    </span>
  );
}

/**
 * 宠物分层动画（Web）：
 * - manifest v2 就绪时，正面 / 侧身两层常驻，只让可见的一层播放，120ms 交叉淡化切换；
 * - 空闲时在舞台内随机左右走动：转身淡出 → 位移 → 侧身待机 → 转回正面；
 * - manifest 缺失 / 加载失败时回落到 PetLottie 的单动画，Lottie 失败再回落到静态图；
 * - 尊重 prefers-reduced-motion：只显示静态图，不播放、不走动。
 */
export function PetMotion({
  manifestUrl,
  kind,
  idleUrl,
  feedUrl,
  evolveUrl,
  imageUrl,
  sideImageUrl,
  fallbackIcon,
  onFinish,
  className,
}: PetMotionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [manifest, setManifest] = useState<PetMotionManifest | null>(null);
  // manifest 未配置或拉取失败时才回落到单动画，加载期间只显示静态图，避免白搭一次旧资源
  const [manifestFailed, setManifestFailed] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState(0);
  const [walkDuration, setWalkDuration] = useState(0);
  const [walking, setWalking] = useState(false);
  const [sideStanding, setSideStanding] = useState(false);
  const [facingLeft, setFacingLeft] = useState(true);
  const [frontImageFailed, setFrontImageFailed] = useState(false);
  const [sideImageFailed, setSideImageFailed] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const walkingRef = useRef(false);
  const startTimer = useRef<number | null>(null);
  const walkTimer = useRef<number | null>(null);

  // 拉取动作包清单；结构不合法按失败处理，回落到单动画
  useEffect(() => {
    if (!manifestUrl) {
      setManifest(null);
      setManifestFailed(true);
      return;
    }
    let cancelled = false;
    setManifest(null);
    setManifestFailed(false);

    (async () => {
      const response = await fetch(manifestUrl);
      if (!response.ok) throw new Error(`manifest ${manifestUrl} ${response.status}`);
      const json: unknown = await response.json();
      if (!isPetMotionManifest(json)) throw new Error("manifest 结构不合法");
      if (!cancelled) setManifest(json);
    })().catch(() => {
      if (!cancelled) setManifestFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);

  // 动作包内所有 JSON 一次性预取，切换动作时不再现拉
  useEffect(() => {
    if (!manifest) return;
    prefetchAnimationData([
      ...Object.values(manifest.front.actions),
      ...Object.values(manifest.side.actions),
    ]);
  }, [manifest]);

  // 舞台尺寸随布局（rem 密度、响应式）变化，位移换算必须实时读
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      setStageSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [manifest]);

  // 舞台尺寸变化后重新居中，避免宠物停在边界外
  const lastWidthRef = useRef(0);
  useEffect(() => {
    const { width } = stageSize;
    if (!width || width === lastWidthRef.current) return;
    lastWidthRef.current = width;
    if (walkingRef.current) return;
    const center = Math.max(0, (width - width * PET_SIZE_RATIO) / 2);
    offsetRef.current = center;
    setOffset(center);
  }, [stageSize]);

  const clearWalkTimers = useCallback(() => {
    if (startTimer.current !== null) window.clearTimeout(startTimer.current);
    if (walkTimer.current !== null) window.clearTimeout(walkTimer.current);
    startTimer.current = null;
    walkTimer.current = null;
  }, []);

  const startWalk = useCallback(() => {
    if (!manifest || reducedMotion || walkingRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;

    const width = stage.clientWidth;
    const petSize = Math.min(width, stage.clientHeight) * PET_SIZE_RATIO;
    const roomLeft = offsetRef.current;
    const roomRight = width - petSize - offsetRef.current;
    const room = Math.max(roomLeft, roomRight);
    const minDistance = width * SAFE_INSET_RATIO;
    if (room <= minDistance) return;

    const goLeft = roomLeft >= roomRight;
    const distance = minDistance + Math.random() * (room - minDistance);
    const target = goLeft ? offsetRef.current - distance : offsetRef.current + distance;

    // 走速按 rem/s 配置，换算时实时读根字号：切换字号密度时走完整条舞台的耗时不变
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const speed = (manifest.side.walkSpeed ?? DEFAULT_WALK_SPEED_REM) * rootFontSize;
    const duration = Math.max(600, (distance / speed) * 1000);

    walkingRef.current = true;
    setWalking(true);
    setSideStanding(false);
    setFacingLeft(goLeft);

    clearWalkTimers();
    // 先完成 120ms 的转身淡化再起步，避免原地滑步
    startTimer.current = window.setTimeout(() => {
      startTimer.current = null;
      if (!walkingRef.current) return;
      setWalkDuration(duration);
      setOffset(target);
      offsetRef.current = target;

      walkTimer.current = window.setTimeout(() => {
        walkTimer.current = null;
        walkingRef.current = false;
        setWalkDuration(0);
        setWalking(false);
        setSideStanding(true);
        // 侧身待机片刻后再转回正面
        walkTimer.current = window.setTimeout(() => {
          walkTimer.current = null;
          setSideStanding(false);
        }, SIDE_STAND_MS);
      }, duration);
    }, FADE_MS + WALK_START_GAP);
  }, [manifest, reducedMotion, clearWalkTimers]);

  // 空闲时随机走动（5–9s）
  useEffect(() => {
    if (!manifest || kind !== "idle" || reducedMotion || !stageSize.width) return;
    let cancelled = false;
    let timer: number | null = null;

    const tick = () => {
      if (cancelled) return;
      if (!walkingRef.current) startWalk();
      timer = window.setTimeout(
        tick,
        WALK_INTERVAL_MIN_MS + Math.random() * (WALK_INTERVAL_MAX_MS - WALK_INTERVAL_MIN_MS),
      );
    };
    timer = window.setTimeout(
      tick,
      FIRST_WALK_MIN_MS + Math.random() * (FIRST_WALK_MAX_MS - FIRST_WALK_MIN_MS),
    );

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [manifest, kind, reducedMotion, stageSize.width, startWalk]);

  // feed / evolve 打断走动，回到正面
  useEffect(() => {
    if (kind === "idle") return;
    walkingRef.current = false;
    setWalking(false);
    setSideStanding(false);
    setWalkDuration(0);
    clearWalkTimers();
  }, [kind, clearWalkTimers]);

  useEffect(
    () => () => {
      if (startTimer.current !== null) window.clearTimeout(startTimer.current);
      if (walkTimer.current !== null) window.clearTimeout(walkTimer.current);
    },
    [],
  );

  const frontAction =
    kind === "feed" ? "feed" : kind === "evolve" ? "evolve" : kind === "sleep" ? "sleep" : "idle";
  const sideVisible = walking || sideStanding;
  const frontUrl = manifest?.front.actions[frontAction] ?? null;
  const sideUrl = manifest?.side.actions[walking ? "walk" : "idle"] ?? null;
  // 没有专属睡眠动作时复用 idle，并降速 + 叠加 CSS 呼吸
  const sleepFallingBackToIdle = kind === "sleep" && !manifest?.front.actions.sleep;

  // 两层常驻：各自一个播放器，只让可见层在播
  const front = useLottiePlayer({
    url: frontUrl,
    loop: frontAction === "idle" || frontAction === "sleep",
    speed: sleepFallingBackToIdle ? 0.45 : 1,
    enabled: !reducedMotion,
    active: !sideVisible,
    onComplete: onFinish,
  });
  const side = useLottiePlayer({
    url: sideUrl,
    loop: true,
    enabled: !reducedMotion,
    active: sideVisible,
  });

  // Lottie 不可用时也要让喂食 / 进化流程按时回落，避免状态机卡住（睡眠是循环，不需要回落）
  const lottieUnavailable = reducedMotion || !frontUrl || front.failed;
  useEffect(() => {
    if (kind === "idle" || kind === "sleep" || !manifest || !lottieUnavailable) return;
    const timer = window.setTimeout(() => onFinish?.(), FALLBACK_FINISH_MS);
    return () => window.clearTimeout(timer);
  }, [kind, manifest, lottieUnavailable, onFinish]);

  // 没有动作包（未配置 / 拉取失败）：沿用原来的单动画实现，其余阶段行为完全不变
  if (manifestFailed) {
    return (
      <div className={cn("relative", className)}>
        <PetLottie
          kind={kind}
          idleUrl={idleUrl}
          feedUrl={feedUrl}
          evolveUrl={evolveUrl}
          imageUrl={imageUrl}
          fallbackIcon={fallbackIcon}
          onFinish={onFinish}
          className="h-full w-full"
        />
        {kind === "sleep" && <SleepZzz />}
      </div>
    );
  }

  const { width, height } = stageSize;
  const petSize = Math.min(width, height) * PET_SIZE_RATIO;
  const frontScale = manifest?.front.scale ?? 1;
  const sideScale = manifest?.side.scale ?? 1;
  const mirrored =
    (manifest?.side.facing ?? "left") !== (facingLeft ? "left" : "right");
  const frontBody = manifest?.front.body || imageUrl;
  const sideBody = manifest?.side.body || sideImageUrl;
  const lottieEnabled = !reducedMotion;
  const frontPlaying = lottieEnabled && front.ready && !front.failed;
  const sidePlaying = lottieEnabled && side.ready && !side.failed;

  return (
    <div ref={stageRef} className={cn("relative overflow-hidden", className)}>
      {kind === "sleep" && <SleepZzz />}
      {/* 位移只改 x：尺寸与偏移来自实时测量，不写死 px */}
      <div
        className="absolute left-0 top-0"
        style={{
          width: petSize ? `${petSize}px` : "100%",
          height: petSize ? `${petSize}px` : "100%",
          top: petSize ? `${(height - petSize) / 2}px` : 0,
          transform: `translateX(${offset}px)`,
          transitionProperty: walkDuration ? "transform" : "none",
          transitionTimingFunction: "ease-in-out",
          transitionDuration: walkDuration ? `${walkDuration}ms` : "0ms",
        }}
      >
        {/* 正面层：常驻，侧身可见时只暂停不卸载 */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity ease-linear",
            sleepFallingBackToIdle && "pet-breathe",
          )}
          style={{ opacity: sideVisible ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
        >
          <div
            className="relative h-full w-full"
            style={{ transform: `scale(${frontScale})` }}
          >
            <div
              ref={front.containerRef}
              aria-hidden="true"
              className={cn("absolute inset-0", !frontPlaying && "hidden")}
            />
            {!frontPlaying &&
              (frontBody && !frontImageFailed ? (
                <img
                  src={frontBody}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={() => setFrontImageFailed(true)}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-full w-full items-center justify-center text-[5.5rem] leading-none"
                >
                  {fallbackIcon || "🐾"}
                </span>
              ))}
          </div>
        </div>

        {/* 侧身层：走动与待机共用，按 manifest.side.facing 决定是否镜像；无 manifest 时不渲染 */}
        {manifest && (
          <div
            className="absolute inset-0 transition-opacity ease-linear"
            style={{
              opacity: sideVisible ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              transform: `scale(${sideScale}) scaleX(${mirrored ? -1 : 1})`,
            }}
          >
            <div className="relative h-full w-full">
              <div
                ref={side.containerRef}
                aria-hidden="true"
                className={cn("absolute inset-0", !sidePlaying && "hidden")}
              />
              {!sidePlaying &&
                (sideBody && !sideImageFailed ? (
                  <img
                    src={sideBody}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={() => setSideImageFailed(true)}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-full w-full items-center justify-center text-[5.5rem] leading-none"
                  >
                    {fallbackIcon || "🐾"}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
