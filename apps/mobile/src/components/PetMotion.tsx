import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Image } from 'expo-image';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import PetLottie, { type PetAnimationKind, inlineImageAssets } from './PetLottie';

/** 分层动作包清单：front 负责原地动作，side 负责横向走动 */
export interface PetMotionManifest {
  version: number;
  size: number;
  front: {
    body: string;
    lid?: string;
    actions: Partial<Record<'idle' | 'happy' | 'feed' | 'evolve', string>>;
  };
  side: {
    body: string;
    /** 侧身图默认朝向，决定镜像方向 */
    facing?: 'left' | 'right';
    /** 走动速度（px/s，按 400 画布计） */
    walkSpeed?: number;
    actions: Partial<Record<'idle' | 'walk', string>>;
  };
}

interface PetMotionProps {
  manifestUrl?: string | null;
  kind: PetAnimationKind;
  idleUrl?: string | null;
  feedUrl?: string | null;
  evolveUrl?: string | null;
  imageUrl?: string | null;
  sideImageUrl?: string | null;
  size: number;
  onFinish?: () => void;
}

const WALK_MIN_DISTANCE = 28;

// 同一份 JSON 只解析一次（图片会内联成 base64，重复解析会重复占内存）
const animationCache = new Map<string, Promise<AnimationObject>>();

const loadAnimation = (url: string) => {
  const cached = animationCache.get(url);
  if (cached) return cached;
  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`lottie ${url} ${response.status}`);
    const json = (await response.json()) as AnimationObject;
    await inlineImageAssets(json);
    return json;
  })();
  animationCache.set(url, promise);
  return promise;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * 宠物互动动画：
 * - 有分层动作包时，原地待机/眨眼、随机横向走动（侧身）、点击开心、拖拽后弹回。
 * - 没有动作包或 lottie 不可用（Expo Go / web）时，回落到 PetLottie 静态形象；
 *   走动仍用静态侧身图位移实现。
 */
const PetMotion: React.FC<PetMotionProps> = ({
  manifestUrl,
  kind,
  idleUrl,
  feedUrl,
  evolveUrl,
  imageUrl,
  sideImageUrl,
  size,
  onFinish,
}) => {
  const [manifest, setManifest] = useState<PetMotionManifest | null>(null);
  const [manifestFailed, setManifestFailed] = useState(false);
  const [animations, setAnimations] = useState<Record<string, AnimationObject>>({});
  const [lottieFailed, setLottieFailed] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [walking, setWalking] = useState(false);
  const [sideStanding, setSideStanding] = useState(false);
  const [facingLeft, setFacingLeft] = useState(true);
  const [happy, setHappy] = useState(false);

  const offset = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const dragStart = useRef(0);
  const dragging = useRef(false);
  const walkingRef = useRef(false);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const lottieAvailable = Platform.OS !== 'web' && !isExpoGo;

  // 拉取动作包清单
  useEffect(() => {
    if (!manifestUrl) {
      setManifest(null);
      setManifestFailed(false);
      return;
    }
    let cancelled = false;
    setManifest(null);
    setManifestFailed(false);
    setAnimations({});
    setLottieFailed(false);

    (async () => {
      const response = await fetch(manifestUrl);
      if (!response.ok) throw new Error(`manifest ${manifestUrl} ${response.status}`);
      const json = (await response.json()) as PetMotionManifest;
      if (!cancelled) setManifest(json);
    })().catch(() => {
      if (!cancelled) setManifestFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);

  // 预加载动作包内所有 JSON
  useEffect(() => {
    if (!manifest || !lottieAvailable) return;
    let cancelled = false;
    const urls = Array.from(
      new Set(
        [
          ...Object.values(manifest.front.actions),
          ...Object.values(manifest.side.actions),
        ].filter((url): url is string => Boolean(url)),
      ),
    );

    Promise.allSettled(urls.map(async (url) => [url, await loadAnimation(url)] as const)).then((results) => {
      if (cancelled) return;
      const map: Record<string, AnimationObject> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') map[result.value[0]] = result.value[1];
      }
      if (Object.keys(map).length === 0) setLottieFailed(true);
      else setAnimations(map);
    });

    return () => {
      cancelled = true;
    };
  }, [manifest, lottieAvailable]);

  // 记录当前位移，供走动/拖拽计算边界
  useEffect(() => {
    const id = offset.addListener(({ value }) => {
      offsetRef.current = value;
    });
    return () => offset.removeListener(id);
  }, [offset]);

  // 初始位置居中
  useEffect(() => {
    if (layoutWidth > size) {
      const center = (layoutWidth - size) / 2;
      offset.setValue(center);
      offsetRef.current = center;
    }
  }, [layoutWidth, size, offset]);

  const cancelWalk = useCallback(() => {
    walkingRef.current = false;
    setWalking(false);
    offset.stopAnimation();
  }, [offset]);

  const playHappy = useCallback(() => {
    cancelWalk();
    setSideStanding(false);
    setHappy(true);
    if (happyTimer.current) clearTimeout(happyTimer.current);
    happyTimer.current = setTimeout(() => setHappy(false), 1500);
  }, [cancelWalk]);

  const startWalk = useCallback(() => {
    if (!manifest || walkingRef.current || dragging.current) return;
    const roomLeft = offsetRef.current;
    const roomRight = layoutWidth - size - offsetRef.current;
    const room = Math.max(roomLeft, roomRight);
    if (room < WALK_MIN_DISTANCE) return;

    const goLeft = roomLeft >= roomRight;
    const distance = Math.min(room, WALK_MIN_DISTANCE + Math.random() * 72);
    const target = goLeft ? offsetRef.current - distance : offsetRef.current + distance;
    const speed = Math.max(24, manifest.side.walkSpeed ?? 72);
    const duration = Math.max(700, (distance / speed) * 1000);

    walkingRef.current = true;
    setWalking(true);
    setSideStanding(false);
    setHappy(false);
    setFacingLeft(goLeft);

    Animated.timing(offset, {
      toValue: target,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      walkingRef.current = false;
      setWalking(false);
      setSideStanding(true);
      if (turnTimer.current) clearTimeout(turnTimer.current);
      turnTimer.current = setTimeout(() => setSideStanding(false), 700);
    });
  }, [manifest, layoutWidth, size, offset]);

  // 空闲时随机走动
  useEffect(() => {
    if (!manifest || kind !== 'idle' || layoutWidth <= size) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      if (!walkingRef.current && !dragging.current) startWalk();
      timer = setTimeout(tick, 5000 + Math.random() * 4000);
    };
    timer = setTimeout(tick, 2500 + Math.random() * 2000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [manifest, kind, layoutWidth, size, startWalk]);

  // 喂食 / 进化时打断走动，回到正面
  useEffect(() => {
    if (kind === 'feed' || kind === 'evolve') {
      cancelWalk();
      setHappy(false);
      setSideStanding(false);
    }
  }, [kind, cancelWalk]);

  useEffect(
    () => () => {
      if (happyTimer.current) clearTimeout(happyTimer.current);
      if (turnTimer.current) clearTimeout(turnTimer.current);
    },
    [],
  );

  // 无法播放 lottie 时，喂食/进化用定时器推进状态，避免父级卡在一次性动作
  const view: 'front' | 'side' =
    kind === 'feed' || kind === 'evolve' ? 'front' : walking || sideStanding ? 'side' : 'front';
  const action: 'idle' | 'happy' | 'feed' | 'evolve' | 'walk' =
    kind === 'feed'
      ? 'feed'
      : kind === 'evolve'
        ? 'evolve'
        : walking
          ? 'walk'
          : happy
            ? 'happy'
            : 'idle';

  const animationUrl = manifest
    ? view === 'side'
      ? manifest.side.actions[action === 'walk' ? 'walk' : 'idle']
      : manifest.front.actions[action as 'idle' | 'happy' | 'feed' | 'evolve']
    : undefined;
  const animation = animationUrl ? animations[animationUrl] : undefined;
  const playing = lottieAvailable && animation && !lottieFailed;
  const expectedLottie = lottieAvailable && !lottieFailed && Boolean(animationUrl);

  useEffect(() => {
    if (kind !== 'feed' && kind !== 'evolve') return;
    if (expectedLottie) return;
    const timer = setTimeout(() => onFinish?.(), 1200);
    return () => clearTimeout(timer);
  }, [kind, expectedLottie, onFinish]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragging.current = true;
          walkingRef.current = false;
          setWalking(false);
          setSideStanding(false);
          offset.stopAnimation();
          dragStart.current = offsetRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          if (!dragging.current || layoutWidth <= size) return;
          const next = clamp(dragStart.current + gesture.dx, 0, layoutWidth - size);
          offsetRef.current = next;
          offset.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          dragging.current = false;
          if (Math.abs(gesture.dx) < 4 && Math.abs(gesture.dy) < 4) return;
          // 松手后弹回拖拽前的位置
          const target = clamp(dragStart.current, 0, Math.max(0, layoutWidth - size));
          Animated.spring(offset, {
            toValue: target,
            useNativeDriver: true,
            bounciness: 6,
            speed: 14,
          }).start();
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
        },
      }),
    [layoutWidth, size, offset],
  );

  const handleAnimationFinish = () => {
    if (action === 'happy') {
      setHappy(false);
      return;
    }
    onFinish?.();
  };

  const handlePress = () => {
    if (kind !== 'idle') return;
    playHappy();
  };

  // 没有分层动作包：回落到原来的单动画实现
  if (!manifest || manifestFailed) {
    return (
      <PetLottie
        kind={kind}
        idleUrl={idleUrl}
        feedUrl={feedUrl}
        evolveUrl={evolveUrl}
        imageUrl={imageUrl}
        size={size}
        onFinish={onFinish}
      />
    );
  }

  const staticBody = view === 'side' ? manifest.side.body || sideImageUrl : manifest.front.body || imageUrl;
  const mirrored = view === 'side' && (manifest.side.facing ?? 'left') !== (facingLeft ? 'left' : 'right');
  const loop = action === 'idle' || action === 'walk';

  return (
    <View
      style={[styles.wrap, { height: size }]}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateX: offset }, { scaleX: mirrored ? -1 : 1 }],
        }}
      >
        <Pressable onPress={handlePress} style={{ width: size, height: size }}>
          {playing ? (
            <LottieView
              key={animationUrl}
              source={animation}
              autoPlay
              loop={loop}
              resizeMode="contain"
              onAnimationFinish={handleAnimationFinish}
              onAnimationFailure={() => setLottieFailed(true)}
              style={styles.lottie}
            />
          ) : staticBody ? (
            <Image
              source={{ uri: staticBody }}
              contentFit="contain"
              style={{ width: size, height: size }}
            />
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  lottie: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default PetMotion;
