import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface QuizOptionProps {
  optionKey: string;
  content: string;
  status: 'default' | 'correct' | 'wrong' | 'revealed';
  disabled: boolean;
  onPress: () => void;
}

const QuizOption: React.FC<QuizOptionProps> = ({ optionKey, content, status, disabled, onPress }) => {
  const getBackgroundColor = (): string => {
    switch (status) {
      case 'correct':
        return '#D1FAE5';
      case 'wrong':
        return '#FEE2E2';
      case 'revealed':
        return '#D1FAE5';
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = (): string => {
    switch (status) {
      case 'correct':
        return '#059669';
      case 'wrong':
        return '#DC2626';
      case 'revealed':
        return '#059669';
      default:
        return '#E5E7EB';
    }
  };

  const getKeyColor = (): string => {
    switch (status) {
      case 'correct':
        return '#059669';
      case 'wrong':
        return '#DC2626';
      case 'revealed':
        return '#059669';
      default:
        return '#3B82F6';
    }
  };

  const getContentColor = (): string => {
    switch (status) {
      case 'correct':
        return '#065F46';
      case 'wrong':
        return '#991B1B';
      case 'revealed':
        return '#065F46';
      default:
        return '#1F2937';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.keyContainer, { borderColor: getKeyColor() }]}>
        <Text style={[styles.keyText, { color: getKeyColor() }]}>{optionKey}</Text>
      </View>
      <Text style={[styles.content, { color: getContentColor() }]} numberOfLines={3}>
        {content}
      </Text>
      {status === 'correct' && <Text style={styles.indicator}>✓</Text>}
      {status === 'wrong' && <Text style={styles.indicator}>✗</Text>}
      {status === 'revealed' && <Text style={[styles.indicator, { color: '#059669' }]}>✓</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  keyContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  keyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  indicator: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 8,
  },
});

export default QuizOption;
