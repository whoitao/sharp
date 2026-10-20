import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UnitInfo } from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import UnitItem from '../../components/UnitItem';
import { useTheme } from '../../hooks/useTheme';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { fetchQuestions } from '../../stores/studySlice';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'UnitList'>;
type UnitListRouteProp = RouteProp<HomeStackParamList, 'UnitList'>;

interface UnitListScreenProps {
  navigation: NavigationProp;
  route: UnitListRouteProp;
}

const UnitListScreen: React.FC<UnitListScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { category } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize } = useSelector((state: RootState) => state.settings);

  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pressingUnitIndex, setPressingUnitIndex] = useState<number | null>(null);

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
    // Prevent duplicate requests while a unit is being loaded.
    if (pressingUnitIndex !== null) return;
    setPressingUnitIndex(unit.unitIndex);
    try {
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
    } finally {
      setPressingUnitIndex(null);
    }
  };

  const renderItem = ({ item }: { item: UnitInfo }) => (
    <UnitItem
      unit={item}
      onPress={() => handleUnitPress(item)}
      loading={pressingUnitIndex === item.unitIndex}
      disabled={pressingUnitIndex !== null}
    />
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={units}
        keyExtractor={(item) => item.unitIndex.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{category.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              每单元 {unitSize} 题 · 共 {units.length} 个单元
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>暂无单元</Text>
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
    paddingTop: 0,
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
});

export default UnitListScreen;
