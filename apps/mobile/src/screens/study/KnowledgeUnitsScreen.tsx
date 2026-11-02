import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { QuestionTag, StudyRecordSummary, UnitInfo } from '@sharp/shared';
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
import StudyFilterBar from '../../components/StudyFilterBar';
import UnitItem from '../../components/UnitItem';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type {
  KnowledgeUnitsParams,
  QuizParams,
  QuizResultParams,
} from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch } from '../../stores';
import { fetchQuestions } from '../../stores/studySlice';

type NavigationProp = NativeStackNavigationProp<
  {
    KnowledgeUnits: KnowledgeUnitsParams;
    Quiz: QuizParams;
    QuizResult: QuizResultParams;
  },
  'KnowledgeUnits'
>;

type RouteProps = RouteProp<{ KnowledgeUnits: KnowledgeUnitsParams }, 'KnowledgeUnits'>;

interface KnowledgeUnitsScreenProps {
  navigation: NavigationProp;
  route: RouteProps;
}

const UNITS_PAGE_SIZE = 10;

const keyExtractor = (item: UnitInfo) => item.unitIndex.toString();

/** 「按知识点学」下一级：该知识点（含子知识点）下的单元列表 */
const KnowledgeUnitsScreen: React.FC<KnowledgeUnitsScreenProps> = ({ navigation, route }) => {
  const {
    knowledgePointId,
    knowledgePointName,
    subjectId,
    gradeId,
    publisherId,
    subjectName,
    scopeLabel,
  } = route.params;
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pressingUnitIndex, setPressingUnitIndex] = useState<number | null>(null);

  const totalUnitsRef = useRef(0);
  const loadedPagesRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        setTags(await api.getTags());
      } catch {
        // 标签拉取失败不影响单元列表
      }
    })();
  }, []);

  const fetchUnits = useCallback(
    async (page: number, opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);
      }
      try {
        const result = await api.getUnits({
          subjectId,
          gradeId: gradeId ?? null,
          publisherId: publisherId ?? null,
          knowledgePointId,
          tagIds: selectedTagIds,
          page,
          pageSize: UNITS_PAGE_SIZE,
        });
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
    [subjectId, gradeId, publisherId, knowledgePointId, selectedTagIds],
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
            const result = await api.getUnits({
              subjectId,
              gradeId: gradeId ?? null,
              publisherId: publisherId ?? null,
              knowledgePointId,
              tagIds: selectedTagIds,
              page: p,
              pageSize: UNITS_PAGE_SIZE,
            });
            refreshed.push(...result.units);
            totalUnitsRef.current = result.totalUnits;
            if (result.units.length === 0) break;
          }
          setUnits(refreshed);
        } catch {
          // 静默刷新失败时保留旧数据
        }
      })();
    }, [subjectId, gradeId, publisherId, knowledgePointId, selectedTagIds]),
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
    fetchUnits(1, { silent: true });
  }, [fetchUnits]);

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }, []);

  const handleUnitPress = useCallback(
    async (unit: UnitInfo) => {
      if (pressingUnitIndex !== null) return;
      setPressingUnitIndex(unit.unitIndex);
      try {
        let previousRecord: StudyRecordSummary | null = null;
        try {
          previousRecord = (
            await api.startStudy({
              subjectId,
              gradeId: gradeId ?? null,
              publisherId: publisherId ?? null,
              knowledgePointId,
              tagIds: selectedTagIds,
              unitIndex: unit.unitIndex,
            })
          ).previous;
        } catch {
          // silently proceed
        }
        const result = await dispatch(
          fetchQuestions({
            unitIndex: unit.unitIndex,
            subjectId,
            gradeId: gradeId ?? undefined,
            publisherId: publisherId ?? undefined,
            knowledgePointId,
            tagIds: selectedTagIds,
          }),
        );
        if (fetchQuestions.fulfilled.match(result)) {
          navigation.navigate('Quiz', {
            unitIndex: unit.unitIndex,
            subjectId,
            gradeId: gradeId ?? undefined,
            publisherId: publisherId ?? undefined,
            knowledgePointId,
            tagIds: selectedTagIds,
            subjectName,
            knowledgePointName,
            previousRecord,
            continueTo: 'KnowledgeUnits',
          });
        }
      } finally {
        setPressingUnitIndex(null);
      }
    },
    [
      pressingUnitIndex,
      subjectId,
      gradeId,
      publisherId,
      knowledgePointId,
      selectedTagIds,
      subjectName,
      knowledgePointName,
      dispatch,
      navigation,
    ],
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

  const listHeader = (scopeLabel || knowledgePointName) ? (
    <View style={{ marginBottom: 12 * spacing }}>
      {!!scopeLabel && (
        <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>{scopeLabel}</Text>
      )}
      {!!knowledgePointName && (
        <Text
          style={{
            color: colors.text,
            fontSize: 15 * font,
            fontWeight: '600',
            marginTop: 4 * spacing,
          }}
        >
          {knowledgePointName}
        </Text>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StudyFilterBar
        subjects={[]}
        selectedSubject={null}
        selectedKP={null}
        onSelectSubject={() => {}}
        onSelectKP={() => {}}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
        onClearTags={() => setSelectedTagIds([])}
        hideScope
        hideKP
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
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
                {t.studyNoUnits}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  empty: { alignItems: 'center' },
});

export default KnowledgeUnitsScreen;
