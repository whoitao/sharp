import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Image } from 'expo-image';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import PetLottie, { type PetAnimationKind, inlineImageAssets } from './PetLottie';

/** 分层动作包清单：front 负责原地动作，side 负责横向走动 */
export interface PetMotionManifest {
  version: number;
  size: number;
  front: {
    body: string;
    lid?: string;
    /** 视觉缩放，用来和侧身形象对齐身高 */
    scale?: number;
    actions: Partial<Record<'idle' | 'happy' | 'feed' | 'evolve' | 'sleep', string>>;
  };
  side: {
    body: string;
    /** 侧身图默认朝向，决定镜像方向 */
    facing?: 'left' | 'right';
    scale?: number;
    /** 走动速度（px/s，按 400 画布计） */
    walkSpeed?: number;
    actions: Partial<Record<'idle' | 'walk', string>>;
  };
  /** 转身过渡帧（30°、55°…），按顺序插在正面与侧身之间 */
  turn?: {
    frames?: string[];
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
// 每一段转身交叉淡化的时长（正面→30°→55°→侧身）
const FADE_MS = 120;
// 转身全部完成后再留一点余量才开始位移，避免起步瞬间滑步
const WALK_START_GAP = 80;
// 走完保持侧身待机的时间
const SIDE_STAND_MS = 600;

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
 * - 正面与侧身用交叉淡化切换，配合 front.scale 对齐身高，避免转身时跳变。
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
  const { colors } = useTheme();

  // 睡眠：正面、原地、不播 happy；有专属 sleep 动画就播，缺失时降级为 idle 降速 + 呼吸
  const asleep = kind === 'sleep';

  const offset = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const dragStart = useRef(0);
  const dragging = useRef(false);
  const walkingRef = useRef(false);
  const walkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 0 = 正面；中间为转身过渡帧；stages = 侧身
  const turnProgress = useRef(new Animated.Value(0)).current;
  // 睡眠呼吸 / 点击轻反馈 / Zzz 呼吸感
  const breath = useRef(new Animated.Value(1)).current;
  const tapScale = useRef(new Animated.Value(1)).current;
  const zzzOpacity = useRef(new Animated.Value(1)).current;
  const frontLottieRef = useRef<React.ElementRef<typeof LottieView>>(null);
  const sideLottieRef = useRef<React.ElementRef<typeof LottieView>>(null);

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
    turnProgress.setValue(0);

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
  }, [manifestUrl, turnProgress]);

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
    if (walkTimer.current) clearTimeout(walkTimer.current);
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

    // 等转身过渡全部走完再起步（原来固定 420ms 会早于淡化结束，产生滑步）
    const fadeMs = FADE_MS * ((manifest.turn?.frames?.length ?? 0) + 2);
    if (walkTimer.current) clearTimeout(walkTimer.current);
    walkTimer.current = setTimeout(() => {
      if (!walkingRef.current) return;
      Animated.timing(offset, {
        toValue: target,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        walkingRef.current = false;
        setWalking(false);
        setSideStanding(true);
        if (turnTimer.current) clearTimeout(turnTimer.current);
        turnTimer.current = setTimeout(() => setSideStanding(false), SIDE_STAND_MS);
      });
    }, fadeMs + WALK_START_GAP);
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
    timer = setTimeout(tick, 3000 + Math.random() * 2000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [manifest, kind, layoutWidth, size, startWalk]);

  // 喂食 / 进化 / 睡眠时打断走动，回到正面
  useEffect(() => {
    if (kind === 'feed' || kind === 'evolve' || kind === 'sleep') {
      cancelWalk();
      setHappy(false);
      setSideStanding(false);
    }
  }, [kind, cancelWalk]);

  // 睡眠呼吸：没有专属 sleep 动画时用轻微缩放缓动补足“在呼吸”的观感
  const hasSleepAction = Boolean(manifest?.front.actions.sleep);
  const degradedSleep = asleep && !hasSleepAction;
  useEffect(() => {
    if (!degradedSleep) {
      breath.stopAnimation();
      breath.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1.025,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      breath.setValue(1);
    };
  }, [degradedSleep, breath]);

  // Zzz 气泡的呼吸感：睡眠时才循环，醒来立刻恢复静止
  useEffect(() => {
    if (!asleep) {
      zzzOpacity.stopAnimation();
      zzzOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zzzOpacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(zzzOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      zzzOpacity.setValue(1);
    };
  }, [asleep, zzzOpacity]);

  const playSleepPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(tapScale, { toValue: 0.985, duration: 90, useNativeDriver: true }),
      Animated.spring(tapScale, { toValue: 1, bounciness: 4, speed: 18, useNativeDriver: true }),
    ]).start();
  }, [tapScale]);

  useEffect(
    () => () => {
      if (walkTimer.current) clearTimeout(walkTimer.current);
      if (happyTimer.current) clearTimeout(happyTimer.current);
      if (turnTimer.current) clearTimeout(turnTimer.current);
    },
    [],
  );

  // 转身过渡：正面 → 30° → 55° → 侧身，逐段交叉淡化
  const turnFrames = manifest?.turn?.frames ?? [];
  const stages = turnFrames.length + 2;
  const sideOn = walking || sideStanding;
  useEffect(() => {
    Animated.timing(turnProgress, {
      toValue: sideOn ? stages : 0,
      duration: FADE_MS * stages,
      // 交叉淡化必须是线性的，两条曲线之和不恒定会在中间叠加出双轮廓
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [sideOn, stages, turnProgress]);

  const stageOpacity = (index: number) => {
    if (index === 0) {
      return turnProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' });
    }
    if (index === stages) {
      return turnProgress.interpolate({ inputRange: [stages - 1, stages], outputRange: [0, 1], extrapolate: 'clamp' });
    }
    return turnProgress.interpolate({
      inputRange: [index - 1, index, index + 1],
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });
  };

  // 转身时轻微收身，弱化坐姿→站姿轮廓突变带来的显胖观感
  const turnDip =
    stages >= 3
      ? turnProgress.interpolate({
          inputRange: [0, 1, stages - 1, stages],
          outputRange: [1, 0.96, 0.96, 1],
          extrapolate: 'clamp',
        })
      : null;

  const frontAction: 'idle' | 'happy' | 'feed' | 'evolve' | 'sleep' =
    kind === 'feed'
      ? 'feed'
      : kind === 'evolve'
        ? 'evolve'
        : kind === 'sleep'
          ? hasSleepAction
            ? 'sleep'
            : 'idle'
          : happy
            ? 'happy'
            : 'idle';
  const sideAction: 'idle' | 'walk' = walking ? 'walk' : 'idle';

  const frontUrl = manifest?.front.actions[frontAction];
  const sideUrl = manifest?.side.actions[sideAction];

  const frontAnimation = frontUrl ? animations[frontUrl] : undefined;
  const sideAnimation = sideUrl ? animations[sideUrl] : undefined;
  const playing = lottieAvailable && !lottieFailed;
  const expectedLottie = playing && Boolean(frontUrl);

  // 只让可见的一层在播，避免两个 Lottie 常驻解码抢帧
  useEffect(() => {
    if (!playing) return;
    if (sideOn) {
      frontLottieRef.current?.pause();
      sideLottieRef.current?.play();
    } else {
      sideLottieRef.current?.pause();
      frontLottieRef.current?.resume();
    }
  }, [playing, sideOn, frontAction, sideAction, frontUrl, sideUrl]);

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
          if (walkTimer.current) clearTimeout(walkTimer.current);
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

  const handleFrontFinish = () => {
    if (frontAction === 'happy') {
      setHappy(false);
      return;
    }
    onFinish?.();
  };

  const handlePress = () => {
    // 睡眠时不唤醒、不播 happy，只给一个轻微缩放反馈
    if (kind === 'sleep') {
      playSleepPulse();
      return;
    }
    if (kind !== 'idle') return;
    playHappy();
  };

  // 没有分层动作包：回落到原来的单动画实现
  if (!manifest || manifestFailed) {
    return (
      <View style={{ width: size, height: size }}>
        <Animated.View style={{ flex: 1, transform: [{ scale: tapScale }, { scale: breath }] }}>
          <PetLottie
            kind={kind}
            idleUrl={idleUrl}
            feedUrl={feedUrl}
            evolveUrl={evolveUrl}
            imageUrl={imageUrl}
            size={size}
            onFinish={onFinish}
          />
        </Animated.View>
        {asleep && (
          <Animated.View pointerEvents="none" style={[styles.zzz, { opacity: zzzOpacity }]}>
            <Text style={[styles.zzzText, { color: colors.textSecondary }]}>Zzz</Text>
          </Animated.View>
        )}
      </View>
    );
  }

  const frontScale = manifest.front.scale ?? 1;
  const sideScale = manifest.side.scale ?? 1;
  const mirrored = (manifest.side.facing ?? 'left') !== (facingLeft ? 'left' : 'right');
  const frontBody = manifest.front.body || imageUrl;
  const sideBody = manifest.side.body || sideImageUrl;

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
          transform: turnDip
            ? [{ translateX: offset }, { scale: tapScale }, { scale: turnDip }]
            : [{ translateX: offset }, { scale: tapScale }],
        }}
      >
        {/* 正面层 */}
        <Animated.View style={[styles.layer, { opacity: stageOpacity(0) }]} pointerEvents="none">
          <Animated.View
            style={{ width: size, height: size, transform: [{ scale: frontScale }, { scale: breath }] }}
          >
            {playing && frontAnimation ? (
              <LottieView
                key={frontUrl}
                ref={frontLottieRef}
                source={frontAnimation}
                autoPlay
                loop={frontAction === 'idle' || frontAction === 'sleep'}
                // 无专属 sleep 动画时，用 idle 降速来表现“睡着”
                speed={degradedSleep ? 0.45 : 1}
                resizeMode="contain"
                onAnimationFinish={handleFrontFinish}
                onAnimationFailure={() => setLottieFailed(true)}
                style={styles.lottie}
              />
            ) : frontBody ? (
              <Image
                source={{ uri: frontBody }}
                contentFit="contain"
                style={{ width: size, height: size }}
              />
            ) : null}
          </Animated.View>
        </Animated.View>

        {/* 转身过渡帧 + 侧身层：共用同一套镜像/缩放 */}
        <View
          pointerEvents="none"
          style={[
            styles.layer,
            {
              width: size,
              height: size,
              transform: [{ scale: sideScale }, { scaleX: mirrored ? -1 : 1 }],
            },
          ]}
        >
          {turnFrames.map((url, index) => (
            <Animated.View key={url} style={[styles.layer, { opacity: stageOpacity(index + 1) }]}>
              <Image
                source={{ uri: url }}
                contentFit="contain"
                style={{ width: size, height: size }}
              />
            </Animated.View>
          ))}

          <Animated.View style={[styles.layer, { opacity: stageOpacity(stages) }]}>
            {playing && sideAnimation ? (
              <LottieView
                key={sideUrl}
                ref={sideLottieRef}
                source={sideAnimation}
                autoPlay={false}
                loop
                resizeMode="contain"
                onAnimationFailure={() => setLottieFailed(true)}
                style={styles.lottie}
              />
            ) : sideBody ? (
              <Image
                source={{ uri: sideBody }}
                contentFit="contain"
                style={{ width: size, height: size }}
              />
            ) : null}
          </Animated.View>
        </View>

        <Pressable onPress={handlePress} style={StyleSheet.absoluteFill} />

        {asleep && (
          <Animated.View pointerEvents="none" style={[styles.zzz, { opacity: zzzOpacity }]}>
            <Text style={[styles.zzzText, { color: colors.textSecondary }]}>Zzz</Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  lottie: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  zzz: {
    position: 'absolute',
    top: 4,
    right: 10,
  },
  zzzText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default PetMotion;
