/**
 * Lottie 资源加载器：与 React 无关的纯逻辑，供 pet-lottie / pet-motion 共用。
 * - 动态引入 lottie-web，全站只加载一次；
 * - 同一份动画 JSON 只请求、解析一次，失败后允许重试；
 * - 统一渲染参数：立绘画布不是 1:1，必须按 meet 完整显示。
 */

export type LottieInstance = {
  destroy: () => void;
  play: () => void;
  pause: () => void;
  addEventListener: (name: string, callback: () => void) => void;
};

export type LottiePlayer = {
  loadAnimation: (config: Record<string, unknown>) => LottieInstance;
};

type AnimationData = Record<string, unknown>;

const animationCache = new Map<string, Promise<AnimationData>>();
let playerPromise: Promise<LottiePlayer> | null = null;

/**
 * lottie-web 对 image-layer 默认用 "xMidYMid slice"，
 * 3:4 立绘会被居中裁切（耳尖 / 脚掌被切）；显式改成 meet 保证完整显示。
 */
export const LOTTIE_RENDERER_SETTINGS = {
  preserveAspectRatio: "xMidYMid meet",
  imagePreserveAspectRatio: "xMidYMid meet",
  progressiveLoad: true,
  hideOnTransparent: true,
} as const;

/** lottie-web 只在首次播放时加载；失败时清空缓存，允许下次重试 */
export function loadLottiePlayer(): Promise<LottiePlayer> {
  if (!playerPromise) {
    playerPromise = import("lottie-web").then(
      (module) =>
        (module as unknown as { default?: LottiePlayer }).default ??
        (module as unknown as LottiePlayer),
    );
    playerPromise.catch(() => {
      playerPromise = null;
    });
  }
  return playerPromise;
}

/** 同一份动画 JSON 只拉取一次；失败后允许下次重试 */
export function loadAnimationData(url: string): Promise<AnimationData> {
  const cached = animationCache.get(url);
  if (cached) return cached;
  const promise = fetch(url, { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error(`lottie ${url} ${response.status}`);
    return response.json() as Promise<AnimationData>;
  });
  animationCache.set(url, promise);
  promise.catch(() => animationCache.delete(url));
  return promise;
}

/** 预取后续动作的 JSON；命中缓存后不会重复请求 */
export function prefetchAnimationData(urls: Array<string | null | undefined>) {
  for (const url of urls) {
    if (!url) continue;
    void loadAnimationData(url).catch(() => {
      /* 预取失败不打断当前动画，真正播放时会重新请求 */
    });
  }
}

export interface CreateLottieOptions {
  container: HTMLElement;
  data: AnimationData;
  loop: boolean;
  onComplete?: () => void;
  onLoaded?: () => void;
  onFailed?: () => void;
}

/** 在容器里创建 SVG 播放器；调用方负责在卸载时 destroy() */
export function createLottieAnimation(
  player: LottiePlayer,
  { container, data, loop, onComplete, onLoaded, onFailed }: CreateLottieOptions,
) {
  container.innerHTML = "";
  const instance = player.loadAnimation({
    container,
    renderer: "svg",
    loop,
    autoplay: false,
    // lottie 会改写传入对象，这里克隆一份，避免缓存复用后动画状态串扰
    animationData: structuredClone(data),
    rendererSettings: LOTTIE_RENDERER_SETTINGS,
  });
  instance.addEventListener("data_failed", () => onFailed?.());
  instance.addEventListener("complete", () => onComplete?.());
  instance.addEventListener("DOMLoaded", () => onLoaded?.());
  return instance;
}
