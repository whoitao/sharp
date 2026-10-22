import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const progress = total > 0 ? current / total : 0;

  return (
    <View style={[styles.container, { paddingHorizontal: 16 * spacing, paddingVertical: 10 * spacing }]}>
      <View style={[styles.bar, { backgroundColor: colors.border, height: 8 * spacing, borderRadius: 4 * radius, marginRight: 12 * spacing }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary, borderRadius: 4 * radius }]} />
      </View>
      <Text style={[styles.text, { color: colors.primary, fontSize: 14 * font }]}>
        {current}/{total}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
});

export default ProgressBar;
