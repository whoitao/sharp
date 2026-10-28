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
        { backgroundColor: colors.accentLight, paddingHorizontal: 10 * spacing },
      ]}
    >
      <Ionicons name="flame" size={13 * font} color={colors.accentStrong} />
      <Text
        style={{
          color: colors.accentStrong,
          fontSize: 12 * font,
          fontWeight: '600',
          marginLeft: 4 * spacing,
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
    height: 26,
    borderRadius: 13,
  },
});

export default StreakBadge;
