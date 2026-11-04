import { theme as antdTheme } from "antd";

/**
 * 管理后台统一视觉规范（以 Dashboard 页为基准）。
 * 色值与 apps/mobile/src/theme/colors.ts 保持一致：浅色绿调白底、深色墨绿底，
 * 避免后台各页面与移动端主题观感割裂。
 */
export const ADMIN_LIGHT_PALETTE = {
  background: "#F2F8F5",
  surface: "#FFFFFF",
  surfaceSecondary: "#F7FBF9",
  text: "#10231A",
  textSecondary: "#4F6B5E",
  textTertiary: "#5C7268",
  border: "#DDE7E1",
  borderLight: "#EDF3F0",
  accent: "#10B981",
  accentStrong: "#0B7F58",
  accentLight: "#DDF6EA",
  warning: "#B45309",
  warningLight: "#FEF3C7",
  error: "#C62828",
  errorLight: "#FDECEC",
};

export const ADMIN_DARK_PALETTE = {
  background: "#0B1512",
  surface: "#14201B",
  surfaceSecondary: "#1B2A23",
  text: "#F2F7F4",
  textSecondary: "#A6BAB0",
  textTertiary: "#93A99F",
  border: "#27362F",
  borderLight: "#1F2E27",
  accent: "#34D399",
  accentStrong: "#34D399",
  accentLight: "#123B2C",
  warning: "#FBBF24",
  warningLight: "#3A2E12",
  error: "#FCA5A5",
  errorLight: "#3A1D1D",
};

export type AdminPalette = typeof ADMIN_LIGHT_PALETTE;

export const getAdminPalette = (isDark: boolean): AdminPalette =>
  isDark ? ADMIN_DARK_PALETTE : ADMIN_LIGHT_PALETTE;

/** Dashboard 与全局 Provider 共用同一套 antd token，任何页面都不会再出现蓝色主色 */
export const buildAdminTheme = (isDark: boolean) => {
  const palette = getAdminPalette(isDark);

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: palette.accent,
      colorInfo: palette.accent,
      colorLink: palette.accentStrong,
      colorSuccess: palette.accent,
      colorWarning: palette.warning,
      colorError: palette.error,
      colorBgContainer: palette.surface,
      colorBgElevated: palette.surface,
      colorBgLayout: palette.background,
      colorBgSpotlight: palette.surfaceSecondary,
      colorBorder: palette.border,
      colorBorderSecondary: palette.borderLight,
      colorText: palette.text,
      colorTextSecondary: palette.textSecondary,
      colorTextTertiary: palette.textTertiary,
      colorTextQuaternary: palette.textTertiary,
      colorFillSecondary: palette.surfaceSecondary,
      colorFillTertiary: palette.surfaceSecondary,
      colorFillQuaternary: palette.surfaceSecondary,
      borderRadius: 10,
      borderRadiusLG: 12,
      fontSize: 13,
    },
    components: {
      Menu: {
        itemSelectedColor: palette.accentStrong,
        itemSelectedBg: palette.accentLight,
        itemHoverBg: palette.surfaceSecondary,
      },
      Layout: {
        bodyBg: palette.background,
        headerBg: palette.surface,
        siderBg: palette.surface,
      },
      Card: {
        headerBg: "transparent",
        bodyPadding: 16,
      },
      Segmented: {
        trackBg: palette.surfaceSecondary,
        itemColor: palette.textSecondary,
        itemSelectedBg: palette.surface,
        itemSelectedColor: palette.accentStrong,
      },
      Table: {
        headerBg: palette.surfaceSecondary,
        headerColor: palette.textSecondary,
        headerSplitColor: "transparent",
        rowHoverBg: palette.surfaceSecondary,
        borderColor: palette.borderLight,
      },
      Select: {
        optionSelectedBg: palette.accentLight,
        optionSelectedColor: palette.accentStrong,
      },
      Empty: {
        colorTextDescription: palette.textTertiary,
      },
    },
  };
};
