import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

// 渐变配色：header 与页面共用同一条纵向渐变（上深下浅），交界处颜色一致保证无缝衔接
// 浅色主题：浅绿 #A7F3D0 → #D1FAE5 → 页面底色 #F0FDF4
// 深色主题：翡翠绿 #059669 → #065F46 → 深色底色 #111827
export const GRADIENT_TOP = { light: '#A7F3D0', dark: '#059669' };
export const GRADIENT_MID = { light: '#D1FAE5', dark: '#065F46' };
export const GRADIENT_BOTTOM = { light: '#F0FDF4', dark: '#111827' };

// 顶部导航栏渐变背景：纵向渐变，随 edge-to-edge 延伸到状态栏区域
const GradientHeader: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? [GRADIENT_TOP.dark, GRADIENT_MID.dark] : [GRADIENT_TOP.light, GRADIENT_MID.light]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
};

export default GradientHeader;
