// 色阶原则：同一主题内所有 surface 只做同色相明度阶梯，层级靠明度差 + 边线/投影表达。
// 深浅两套都不能让卡片和背景差色相（蓝灰卡片配绿色底就是深色显割裂的根因）。
export const lightColors = {
  background: '#F2F8F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#F7FBF9',
  text: '#10231A',
  textSecondary: '#4F6B5E',
  textTertiary: '#5C7268',
  border: '#DDE7E1',
  borderLight: '#EDF3F0',
  accent: '#10B981',
  // 需要承载文字时（tab 标签等）用更深的强调色：accent 对白底只有 2.5:1
  accentStrong: '#0B7F58',
  accentLight: '#DDF6EA',
  primary: '#2563EB',
  primaryLight: '#EFF5FF',
  error: '#C62828',
  errorLight: '#FDECEC',
  dangerSurface: '#FDECEC',
  success: '#0B7F58',
  successLight: '#DDF6EA',
  // 绿色底上的正文：success 对 successLight 只有 4.4:1，需要更深一档
  successText: '#065F46',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  cardShadow: '#10231A',
  statusBar: 'dark-content' as 'dark-content' | 'light-content',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  background: '#0B1512',
  surface: '#14201B',
  surfaceSecondary: '#1B2A23',
  text: '#F2F7F4',
  textSecondary: '#A6BAB0',
  textTertiary: '#93A99F',
  border: '#27362F',
  borderLight: '#1F2E27',
  accent: '#34D399',
  accentStrong: '#34D399',
  accentLight: '#123B2C',
  primary: '#60A5FA',
  primaryLight: '#16293D',
  error: '#FCA5A5',
  errorLight: '#3A1D1D',
  dangerSurface: '#3A1D1D',
  success: '#34D399',
  successLight: '#123B2C',
  successText: '#34D399',
  warning: '#FBBF24',
  warningLight: '#3A2E12',
  cardShadow: '#000000',
  statusBar: 'light-content',
};
