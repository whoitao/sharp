import type { Category } from '@sharp/shared';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: colors.accentLight }]}>
        <Text style={styles.icon}></Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]}>{category.name}</Text>
        {category.questionCount !== undefined && category.parentId !== '0' && (
          <Text style={[styles.count, { color: colors.textSecondary }]}>{category.questionCount} 题</Text>
        )}
      </View>
      <Text style={[styles.arrow, { color: colors.textTertiary }]}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  count: {
    fontSize: 13,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
  },
});

export default CategoryCard;
