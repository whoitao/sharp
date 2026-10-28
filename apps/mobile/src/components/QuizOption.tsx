import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import RichTextView from './RichTextView';

interface QuizOptionProps {
  optionKey: string;
  content: string;
  status: 'default' | 'selected' | 'correct' | 'wrong' | 'revealed';
  disabled: boolean;
  onPress: () => void;
}

const QuizOption: React.FC<QuizOptionProps> = ({ optionKey, content, status, disabled, onPress }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();

  const getBackgroundColor = (): string => {
    switch (status) {
      case 'selected':
        return colors.primaryLight;
      case 'correct':
        return colors.accentLight;
      case 'wrong':
        return colors.errorLight;
      case 'revealed':
        return colors.accentLight;
      default:
        return colors.surface;
    }
  };

  const getBorderColor = (): string => {
    switch (status) {
      case 'selected':
        return colors.primary;
      case 'correct':
        return colors.success;
      case 'wrong':
        return colors.error;
      case 'revealed':
        return colors.success;
      default:
        return colors.border;
    }
  };

  const getKeyColor = (): string => {
    switch (status) {
      case 'selected':
        return colors.primary;
      case 'correct':
        return colors.success;
      case 'wrong':
        return colors.error;
      case 'revealed':
        return colors.success;
      default:
        return colors.primary;
    }
  };

  const getContentColor = (): string => {
    switch (status) {
      case 'correct':
        return colors.successText;
      case 'wrong':
        return colors.error;
      case 'revealed':
        return colors.successText;
      default:
        return colors.text;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: 2,
          borderRadius: 12 * radius,
          paddingHorizontal: 14 * spacing,
          paddingVertical: 12 * spacing,
          marginBottom: 10 * spacing,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.keyContainer, { borderColor: getKeyColor(), width: 32 * font, height: 32 * font, borderRadius: 16 * font }]}>
        <Text style={[styles.keyText, { color: getKeyColor(), fontSize: 14 * font }]}>{optionKey}</Text>
      </View>
      <RichTextView
        html={content}
        fontSize={15 * font}
        lineHeight={22 * font}
        color={getContentColor()}
        containerStyle={{ flex: 1 }}
        numberOfLines={3}
      />
      {status === 'correct' && <Text style={[styles.indicator, { color: colors.success, fontSize: 18 * font }]}>✓</Text>}
      {status === 'wrong' && <Text style={[styles.indicator, { color: colors.error, fontSize: 18 * font }]}>✗</Text>}
      {status === 'revealed' && <Text style={[styles.indicator, { color: colors.success, fontSize: 18 * font }]}>✓</Text>}
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
    marginLeft: 8,
  },
});

export default QuizOption;
