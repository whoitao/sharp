import { darkColors, lightColors } from './colors';

// header 的结束色必须等于页面的起始色，两边引用同一个 seam 常量，避免手抄两份色值后漂移。
const SEAM = {
  light: '#E9F7F1',
  dark: '#0E231A',
};

// 首页「继续学习」主卡与 header 共用同一组绿阶，卡片落在页面顶部时和头部是同一片色域。
const HEADER = {
  light: ['#D8F7E7', SEAM.light] as const,
  dark: ['#123A2A', SEAM.dark] as const,
};

export const gradients = {
  light: {
    header: HEADER.light,
    heroCard: HEADER.light,
    screen: [SEAM.light, lightColors.background] as const,
  },
  dark: {
    header: HEADER.dark,
    heroCard: HEADER.dark,
    screen: [SEAM.dark, darkColors.background] as const,
  },
};
