import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { GRADIENT_BOTTOM, GRADIENT_MID } from './GradientHeader';

interface GradientScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

// 页面级渐变背景：与头部渐变同色衔接（页面从 GRADIENT_MID 开始），铺满整个屏幕
const GradientScreen: React.FC<GradientScreenProps> = ({ children, style }) => {
  const { isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? [GRADIENT_MID.dark, GRADIENT_BOTTOM.dark] : [GRADIENT_MID.light, GRADIENT_BOTTOM.light]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default GradientScreen;
