import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { Category } from '@sharp/shared';
import { api } from '../../services/api';
import CategoryCard from '../../components/CategoryCard';
import { useTheme } from '../../hooks/useTheme';
import type { HomeStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Category'>;
type CategoryRouteProp = RouteProp<HomeStackParamList, 'Category'>;

interface CategoryScreenProps {
  navigation: NavigationProp;
  route: CategoryRouteProp;
}

const CategoryScreen: React.FC<CategoryScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { category } = route.params;
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLeaf, setIsLeaf] = useState(false);

  const fetchSubCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCategories(category.id);
      if (data.length === 0) {
        // This is a leaf category with questions
        setIsLeaf(true);
      } else {
        setIsLeaf(false);
        setSubCategories(data);
      }
    } catch {
      setSubCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category.id]);

  useEffect(() => {
    fetchSubCategories();
  }, [fetchSubCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubCategories();
  };

  const handleSubCategoryPress = (subCategory: Category) => {
    navigation.navigate('Category', { category: subCategory });
  };

  const handleStartLearning = () => {
    navigation.navigate('UnitList', { category });
  };

  const renderItem = ({ item }: { item: Category }) => (
    <CategoryCard category={item} onPress={() => handleSubCategoryPress(item)} />
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isLeaf) {
    return (
      <View style={[styles.leafContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.leafContent, { backgroundColor: colors.surface }]}>
          <Text style={styles.leafIcon}>📝</Text>
          <Text style={[styles.leafTitle, { color: colors.text }]}>{category.name}</Text>
          <Text style={[styles.leafDescription, { color: colors.textSecondary }]}>
            {category.questionCount ? `共 ${category.questionCount} 道题目` : '准备开始学习'}
          </Text>
          <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={handleStartLearning} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>进入学习</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={subCategories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{category.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>选择子分类</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>暂无子分类</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  leafContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  leafContent: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
  },
  leafIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  leafTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  leafDescription: {
    fontSize: 15,
    marginBottom: 32,
  },
  startButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CategoryScreen;
