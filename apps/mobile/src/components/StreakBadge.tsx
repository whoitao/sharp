import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';

/** 连续学习天数徽章：首页 header 左侧，点击进入学习记录；0 天也照常显示，否则入口会消失 */
const StreakBadge: React.FC<{ days: number; onPress?: () => void }> = ({ days, onPress }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const active = days > 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      // 视觉高度 22，补足到 44 的可点高度
      hitSlop={{ top: 11, bottom: 11, left: 6, right: 6 }}
      style={[
        styles.badge,
        {
          // 透明底：直接融在 header 的浅绿渐变上，只保留图标、文字与间距
          paddingHorizontal: 8 * spacing,
        },
      ]}
    >
      <Ionicons
        name={active ? 'flame' : 'flame-outline'}
        size={11 * font}
        color={active ? colors.accentStrong : colors.textTertiary}
      />
      <Text
        style={{
          color: active ? colors.text : colors.textSecondary,
          fontSize: 11 * font,
          fontWeight: '600',
          marginLeft: 3 * spacing,
        }}
      >
        {t.homeStreak(days)}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
  },
});

export default StreakBadge;
