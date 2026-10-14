import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const progress = total > 0 ? current / total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.text}>
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
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  fill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    minWidth: 50,
    textAlign: 'right',
  },
});

export default ProgressBar;
