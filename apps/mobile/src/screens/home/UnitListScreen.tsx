import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { UnitInfo } from '@sharp/shared';
import { api } from '../../services/api';
import { fetchQuestions } from '../../stores/studySlice';
import type { RootState, AppDispatch } from '../../stores';
import UnitItem from '../../components/UnitItem';
import type { HomeStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'UnitList'>;
type UnitListRouteProp = RouteProp<HomeStackParamList, 'UnitList'>;

interface UnitListScreenProps {
  navigation: NavigationProp;
  route: UnitListRouteProp;
}

const UnitListScreen: React.FC<UnitListScreenProps> = ({ navigation, route }) => {
  const { category } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize } = useSelector((state: RootState) => state.settings);

  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUnits(category.id);
      setUnits(data);
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category.id]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUnits();
  };

  const handleUnitPress = async (unit: UnitInfo) => {
    try {
      await api.startStudy(category.id, unit.unitIndex);
    } catch {
      // silently proceed even if start fails
    }
    const result = await dispatch(
      fetchQuestions({ categoryId: category.id, unitIndex: unit.unitIndex })
    );
    if (fetchQuestions.fulfilled.match(result)) {
      navigation.navigate('Quiz', {
        categoryId: category.id,
        unitIndex: unit.unitIndex,
        categoryName: category.name,
      });
    }
  };

  const renderItem = ({ item }: { item: UnitInfo }) => (
    <UnitItem unit={item} onPress={() => handleUnitPress(item)} />
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={units}
        keyExtractor={(item) => item.unitIndex.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{category.name}</Text>
            <Text style={styles.subtitle}>
              每单元 {unitSize} 题 · 共 {units.length} 个单元
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>暂无单元</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
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
    color: '#9CA3AF',
  },
});

export default UnitListScreen;
