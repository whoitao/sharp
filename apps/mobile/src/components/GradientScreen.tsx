import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { gradients } from '../theme/gradients';

interface GradientScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

// 页面级渐变：起始色 === header 结束色，结束色 === 主题 background，
// 于是底部与 tab bar（backgroundColor 同为 background）之间是连续的，没有硬边。
const GradientScreen: React.FC<GradientScreenProps> = ({ children, style }) => {
  const { isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? gradients.dark.screen : gradients.light.screen}
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
