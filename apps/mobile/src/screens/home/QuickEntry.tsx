import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { cardShadow } from '../../theme/shadows';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface QuickEntryProps {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}

/** 首页快捷入口：常驻三格，替代原来会被自动轮播换走的横幅 */
const QuickEntry: React.FC<QuickEntryProps> = ({ icon, label, onPress }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.item,
        cardShadow(isDark),
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12 * radius,
          padding: 11 * spacing,
        },
      ]}
    >
      <View
        style={{
          backgroundColor: colors.accentLight,
          width: 32 * spacing,
          height: 32 * spacing,
          borderRadius: 9 * radius,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8 * spacing,
        }}
      >
        <Ionicons name={icon} size={17 * font} color={colors.accentStrong} />
      </View>
      <Text
        numberOfLines={1}
        style={{ color: colors.text, fontSize: 12 * font, fontWeight: '600', textAlign: 'center' }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default QuickEntry;
