import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';

/** 连续学习天数徽章：画在首页 header 右侧，数据由首页拉取后传入 */
const StreakBadge: React.FC<{ days: number }> = ({ days }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.badge,
        {
          // 透明底：直接融在 header 的浅绿渐变上，只保留图标、文字与间距
          paddingHorizontal: 8 * spacing,
        },
      ]}
    >
      <Ionicons name="flame" size={11 * font} color={colors.accentStrong} />
      <Text
        style={{
          color: colors.text,
          fontSize: 11 * font,
          fontWeight: '600',
          marginLeft: 3 * spacing,
        }}
      >
        {t.homeStreak(days)}
      </Text>
    </View>
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
