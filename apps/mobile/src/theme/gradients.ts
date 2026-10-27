import { darkColors, lightColors } from './colors';

// header 的结束色必须等于页面的起始色，两边引用同一个 seam 常量，避免手抄两份色值后漂移。
const SEAM = {
  light: '#E9F7F1',
  dark: '#0E231A',
};

export const gradients = {
  light: {
    header: ['#D8F7E7', SEAM.light] as const,
    screen: [SEAM.light, lightColors.background] as const,
  },
  dark: {
    header: ['#123A2A', SEAM.dark] as const,
    screen: [SEAM.dark, darkColors.background] as const,
  },
};
