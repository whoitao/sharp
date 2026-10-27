import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

// 顶部导航栏渐变背景：横向左→右渐变，随 edge-to-edge 延伸到状态栏区域
const GradientHeader: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? ['#1E3A5F', '#111827'] : ['#3B82F6', '#60A5FA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );
};

export default GradientHeader;
