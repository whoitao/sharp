import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
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

/**
 * 宠物动画：优先播放 Lottie，缺地址、加载失败或环境不支持时回退静态形象图。
 * - lottie-react-native 是原生模块，Expo Go（StoreClient）里没有，必须降级，否则渲染即崩溃。
 * - 远程 Lottie 的图片资源用 assets[].u 绝对地址，LottieView 按 u + p 解析。
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

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const lottieAvailable = Platform.OS !== 'web' && !isExpoGo;

  const url = kind === 'feed' ? feedUrl : kind === 'evolve' ? evolveUrl : idleUrl;

  // 切换动画时重置失败态，避免某个动画失败后其余动画也被永久降级
  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!lottieAvailable || !url || failed) {
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} contentFit="contain" style={{ width: size, height: size }} />;
    }
    return null;
  }

  return (
    <LottieView
      source={{ uri: url }}
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
