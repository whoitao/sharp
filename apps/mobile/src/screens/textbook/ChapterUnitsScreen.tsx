import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StudyRecordSummary, UnitInfo } from '@sharp/shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import UnitItem from '../../components/UnitItem';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { QuizParams, QuizResultParams, TextbookUnitsParams } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch } from '../../stores';
import { fetchQuestions } from '../../stores/studySlice';

type NavigationProp = NativeStackNavigationProp<
  {
    Textbook: undefined;
    TextbookUnits: TextbookUnitsParams;
    Quiz: QuizParams;
    QuizResult: QuizResultParams;
  },
  'TextbookUnits'
>;

type RouteProps = RouteProp<{ TextbookUnits: TextbookUnitsParams }, 'TextbookUnits'>;

interface ChapterUnitsScreenProps {
  navigation: NavigationProp;
  route: RouteProps;
}

const UNITS_PAGE_SIZE = 10;

const keyExtractor = (item: UnitInfo) => item.unitIndex.toString();

const ChapterUnitsScreen: React.FC<ChapterUnitsScreenProps> = ({ navigation, route }) => {
  const { chapterId, chapterName, textbookLabel, breadcrumb, subjectId } = route.params;
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pressingUnitIndex, setPressingUnitIndex] = useState<number | null>(null);

  const totalUnitsRef = useRef(0);
  const loadedPagesRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchUnits = useCallback(
    async (page: number, opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);
      }
      try {
        const result = await api.getChapterUnits(
          chapterId,
          subjectId,
          page,
          UNITS_PAGE_SIZE,
        );
        totalUnitsRef.current = result.totalUnits;
        loadedPagesRef.current = page;
        setUnits((prev) => (page === 1 ? result.units : [...prev, ...result.units]));
      } catch {
        if (!silent && page === 1) setUnits([]);
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
        }
        setRefreshing(false);
      }
    },
    [chapterId, subjectId],
  );

  // 首屏加载第一页
  useEffect(() => {
    fetchUnits(1);
  }, [fetchUnits]);

  // 从答题页返回时静默刷新已加载页的单元进度
  useFocusEffect(
    useCallback(() => {
      const pages = loadedPagesRef.current;
      if (pages < 1) return;
      (async () => {
        try {
          const refreshed: UnitInfo[] = [];
          for (let p = 1; p <= pages; p += 1) {
            const result = await api.getChapterUnits(chapterId, subjectId, p, UNITS_PAGE_SIZE);
            refreshed.push(...result.units);
            totalUnitsRef.current = result.totalUnits;
            if (result.units.length === 0) break;
          }
          setUnits(refreshed);
        } catch {
          // 静默刷新失败时保留旧数据
        }
      })();
    }, [chapterId, subjectId]),
  );

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMoreRef.current) return;
    if (units.length >= totalUnitsRef.current) return;
    loadingMoreRef.current = true;
    fetchUnits(loadedPagesRef.current + 1).finally(() => {
      loadingMoreRef.current = false;
    });
  }, [fetchUnits, loading, units.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // 静默刷新，保持列表可见
    fetchUnits(1, { silent: true });
  }, [fetchUnits]);

  const handleUnitPress = useCallback(
    async (unit: UnitInfo) => {
      if (pressingUnitIndex !== null) return;
      setPressingUnitIndex(unit.unitIndex);
      try {
        let previousRecord: StudyRecordSummary | null = null;
        try {
          previousRecord = (
            await api.startChapterStudy(chapterId, unit.unitIndex, subjectId)
          ).previous;
        } catch {
          // silently proceed
        }
        const result = await dispatch(
          fetchQuestions({ chapterId, unitIndex: unit.unitIndex, subjectId }),
        );
        if (fetchQuestions.fulfilled.match(result)) {
          navigation.navigate('Quiz', {
            chapterId,
            chapterName,
            textbookLabel,
            unitIndex: unit.unitIndex,
            subjectId,
            previousRecord,
            continueTo: 'TextbookUnits',
          });
        }
      } finally {
        setPressingUnitIndex(null);
      }
    },
    [pressingUnitIndex, chapterId, chapterName, textbookLabel, subjectId, dispatch, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: UnitInfo }) => (
      <UnitItem
        unit={item}
        onPress={handleUnitPress}
        loading={pressingUnitIndex === item.unitIndex}
        disabled={pressingUnitIndex !== null}
      />
    ),
    [handleUnitPress, pressingUnitIndex],
  );

  const listHeader = (breadcrumb || textbookLabel) ? (
    <View style={{ marginBottom: 12 * spacing }}>
      {!!textbookLabel && (
        <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>{textbookLabel}</Text>
      )}
      {!!breadcrumb && (
        <Text
          style={{
            color: colors.text,
            fontSize: 15 * font,
            fontWeight: '600',
            marginTop: 4 * spacing,
          }}
        >
          {breadcrumb}
        </Text>
      )}
    </View>
  ) : null;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <FlatList
        data={units}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { padding: 16 * spacing, paddingTop: 8 * spacing, paddingBottom: 24 * spacing },
        ]}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
            <Text style={{ color: colors.textTertiary, fontSize: 16 * font }}>
              {t.textbookUnitsEmpty}
            </Text>
          </View>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 12 * spacing }} color={colors.accent} />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  empty: { alignItems: 'center' },
});

export default ChapterUnitsScreen;
