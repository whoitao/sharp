import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { gradients } from '../theme/gradients';

// 顶部导航栏渐变：随 edge-to-edge 延伸到状态栏区域。
// 结束色与页面起始色严格相同（共用 theme/gradients.ts 的 seam），交界处不会出现色差。
const GradientHeader: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? gradients.dark.header : gradients.light.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
};

export default GradientHeader;
