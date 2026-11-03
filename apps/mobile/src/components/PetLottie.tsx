import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Image } from 'expo-image';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

export type PetAnimationKind = 'idle' | 'feed' | 'evolve';

interface PetLottieProps {
  kind: PetAnimationKind;
  idleUrl?: string | null;
  feedUrl?: string | null;
  evolveUrl?: string | null;
  imageUrl?: string | null;
  size: number;
  onFinish?: () => void;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('image read failed'));
    reader.readAsDataURL(blob);
  });

/**
 * 安卓 lottie 只会从本地 assets 目录找图片资源（assets[].u + p），
 * 拿到远程图片路径时会抛 "You must set an images folder before loading an image" 直接闪退。
 * 这里在 JS 侧把图片资源下载并转成 base64 data URI，交给 lottie 解析，规避该限制。
 */
export const inlineImageAssets = async (json: AnimationObject) => {
  await Promise.all(
    (json.assets ?? []).map(async (asset) => {
      if (!asset.p || asset.p.startsWith('data:')) return;
      const src = /^https?:\/\//.test(asset.p) ? asset.p : `${asset.u ?? ''}${asset.p}`;
      const response = await fetch(src);
      if (!response.ok) throw new Error(`image ${src} ${response.status}`);
      asset.p = await blobToDataUrl(await response.blob());
      asset.e = 1;
      delete asset.u;
    }),
  );
  return json;
};

/**
 * 宠物动画：优先播放 Lottie，缺地址、加载失败或环境不支持时回退静态形象图。
 * - lottie-react-native 是原生模块，Expo Go（StoreClient）里没有，必须降级，否则渲染即崩溃。
 * - JSON 由 JS 侧拉取并内联图片资源后再交给原生，避免原生远程加载的图片目录限制。
 */
const PetLottie: React.FC<PetLottieProps> = ({
  kind,
  idleUrl,
  feedUrl,
  evolveUrl,
  imageUrl,
  size,
  onFinish,
}) => {
  const [failed, setFailed] = useState(false);
  const [animation, setAnimation] = useState<AnimationObject | null>(null);

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const lottieAvailable = Platform.OS !== 'web' && !isExpoGo;

  const url = kind === 'feed' ? feedUrl : kind === 'evolve' ? evolveUrl : idleUrl;

  useEffect(() => {
    if (!lottieAvailable || !url) {
      setAnimation(null);
      return;
    }

    let cancelled = false;
    setFailed(false);
    setAnimation(null);

    (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`lottie ${url} ${response.status}`);
      const json = (await response.json()) as AnimationObject;
      await inlineImageAssets(json);
      if (!cancelled) setAnimation(json);
    })().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [lottieAvailable, url]);

  if (!lottieAvailable || !animation || failed) {
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} contentFit="contain" style={{ width: size, height: size }} />;
    }
    return null;
  }

  return (
    <LottieView
      source={animation}
      autoPlay
      loop={kind === 'idle'}
      speed={1}
      resizeMode="contain"
      onAnimationFinish={onFinish}
      onAnimationFailure={() => setFailed(true)}
      style={StyleSheet.flatten([{ width: size, height: size, backgroundColor: 'transparent' }])}
    />
  );
};

export default PetLottie;
