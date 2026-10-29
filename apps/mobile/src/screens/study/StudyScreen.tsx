import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  Category,
  Grade,
  KnowledgePoint,
  QuestionTag,
  StudyRecordSummary,
  Subject,
  UnitInfo
} from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import StudyFilterBar from '../../components/StudyFilterBar';
import UnitItem from '../../components/UnitItem';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudyStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';
import { fetchQuestions } from '../../stores/studySlice';
import { hasStudyCache } from '../../utils/studyCache';

type NavigationProp = NativeStackNavigationProp<StudyStackParamList, 'Study'>;

interface StudyScreenProps {
  navigation: NavigationProp;
  route: RouteProp<StudyStackParamList, 'Study'>;
}

// 单元列表每页加载数量（触底翻页）
const UNITS_PAGE_SIZE = 10;

const keyExtractor = (item: UnitInfo) => item.unitIndex.toString();

const StudyScreen: React.FC<StudyScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId: savedGradeId, subjectId: savedSubjectId } = useSelector(
    (state: RootState) => state.settings,
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tags, setTags] = useState<QuestionTag[]>([]);
  // 有教材内容时才露出「教材同步」入口
  const [textbookAvailable, setTextbookAvailable] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedKP, setSelectedKP] = useState<KnowledgePoint | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pressingUnitIndex, setPressingUnitIndex] = useState<number | null>(null);

  // 首次进入时用于恢复全局学习范围；后续用户修改不再触发重新拉取字典
  const initialScopeRef = useRef({ gradeId: savedGradeId, subjectId: savedSubjectId });

  const fetchInitialData = useCallback(async () => {
    // 仅在无有效缓存时显示 loading，缓存命中则静默刷新
    const cached = await hasStudyCache();
    if (!cached) setInitialLoading(true);
    try {
      const [subs, availability, gradeList, tagList] = await Promise.all([
        api.getSubjects(),
        api.getTextbookAvailability(),
        api.getGrades(),
        api.getTags(),
      ]);
      setSubjects(subs);
      setTextbookAvailable(availability.length > 0);
      setGrades(gradeList);
      setTags(tagList);
      // 恢复全局「年级 + 科目」学习范围
      const { gradeId, subjectId } = initialScopeRef.current;
      if (gradeId) {
        const grade = gradeList.find((g) => g.id === gradeId);
        if (grade) setSelectedGrade(grade);
      }
      if (subjectId) {
        const subject = subs.find((s) => s.id === subjectId);
        if (subject) setSelectedSubject(subject);
      }
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // 分类（考试范围）为可选项，随科目变化：只显示该科目下有题目的分类；切换科目后清空已选
  useEffect(() => {
    let cancelled = false;
    setSelectedCategory(null);
    if (!selectedSubject) {
      setCategories([]);
      return;
    }
    (async () => {
      try {
        const tree = await api.getCategoriesBySubject(selectedSubject.id);
        if (!cancelled) setCategories(tree);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSubject]);

  // 单元列表的筛选键：科目 + 知识点必选，分类为空表示「全部」，年级与标签为可选横向筛选
  const buildUnitsKey = useCallback(
    (
      cat: Category | null,
      sub: Subject | null,
      kp: KnowledgePoint | null,
      grade: Grade | null,
      tagIds: string[],
    ): string | null =>
      sub && kp
        ? `${cat?.id ?? 'all'}|${sub.id}|${kp.id}|${grade?.id ?? 'all'}|${tagIds.slice().sort().join(',')}`
        : null,
    []
  );

  // 记录最近一次成功加载单元列表时的筛选组合，用于区分“筛选变化”和“回到页面”两种刷新
  const lastUnitsKeyRef = useRef<string | null>(null);
  // 分页进度（用 ref 避免触底回调/静默刷新把它们列为依赖而重复触发）
  const totalUnitsRef = useRef(0);
  const loadedPagesRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 按页加载单元列表：page=1 覆盖列表，page>1 触底追加
  // silent=true 时不显示 loading、失败时保留旧数据（用于回到页面时的静默刷新）
  const fetchUnits = useCallback(async (pageToLoad: number, opts?: { silent?: boolean }) => {
    // 科目与知识点必选；分类不选表示不限考试范围
    if (!selectedSubject || !selectedKP) {
      setUnits([]);
      totalUnitsRef.current = 0;
      loadedPagesRef.current = 0;
      setLoading(false);
      return;
    }
    const silent = opts?.silent === true;
    if (!silent) {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);
    }
    try {
      const { units: pageUnits, totalUnits } = await api.getUnits({
        categoryId: selectedCategory?.id ?? null,
        subjectId: selectedSubject.id,
        gradeId: selectedGrade?.id ?? null,
        knowledgePointId: selectedKP.id,
        tagIds: selectedTagIds,
        page: pageToLoad,
        pageSize: UNITS_PAGE_SIZE,
      });
      totalUnitsRef.current = totalUnits;
      loadedPagesRef.current = pageToLoad;
      setUnits((prev) => (pageToLoad === 1 ? pageUnits : [...prev, ...pageUnits]));
      lastUnitsKeyRef.current = buildUnitsKey(
        selectedCategory,
        selectedSubject,
        selectedKP,
        selectedGrade,
        selectedTagIds,
      );
    } catch {
      if (!silent && pageToLoad === 1) setUnits([]);
    } finally {
      if (!silent) {
        setLoading(false);
        setLoadingMore(false);
      }
      setRefreshing(false);
    }
  }, [selectedCategory, selectedSubject, selectedGrade, selectedKP, selectedTagIds, buildUnitsKey]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 首页点学科行进入：科目列表到位后自动选中该学科，然后立刻清掉参数
  // （清掉后再次点同一学科还能触发；已选知识点的清空由 StudyFilterBar 负责）
  const requestedSubjectId = route.params?.subjectId;
  useEffect(() => {
    if (!requestedSubjectId || subjects.length === 0) return;
    const target = subjects.find((subject) => subject.id === requestedSubjectId);
    navigation.setParams({ subjectId: undefined });
    if (target) setSelectedSubject(target);
  }, [requestedSubjectId, subjects, navigation]);

  // 筛选变化时统一从这里加载第一页（带 loading）
  useEffect(() => {
    fetchUnits(1);
  }, [fetchUnits]);

  // 回到页面时静默刷新已加载页的单元进度（从 Quiz 完成返回时最关键）；
  // 仅当筛选组合与上次成功加载一致时才刷新——筛选变化由上面的 useEffect 负责，
  // 否则选中分类/科目/知识点时同一接口会被连发两次
  useFocusEffect(
    useCallback(() => {
      const key = buildUnitsKey(
        selectedCategory,
        selectedSubject,
        selectedKP,
        selectedGrade,
        selectedTagIds,
      );
      if (!key || key !== lastUnitsKeyRef.current) return;
      const pages = loadedPagesRef.current;
      if (pages < 1) return;
      (async () => {
        try {
          const refreshed: UnitInfo[] = [];
          for (let p = 1; p <= pages; p += 1) {
            const { units: pageUnits, totalUnits } = await api.getUnits({
              categoryId: selectedCategory?.id ?? null,
              subjectId: selectedSubject!.id,
              gradeId: selectedGrade?.id ?? null,
              knowledgePointId: selectedKP!.id,
              tagIds: selectedTagIds,
              page: p,
              pageSize: UNITS_PAGE_SIZE,
            });
            refreshed.push(...pageUnits);
            totalUnitsRef.current = totalUnits;
            if (pageUnits.length === 0) break;
          }
          setUnits(refreshed);
        } catch {
          // 静默刷新失败时保留旧数据
        }
      })();
    }, [selectedCategory, selectedSubject, selectedGrade, selectedKP, selectedTagIds, buildUnitsKey])
  );

  // 触底加载下一页
  const handleLoadMore = useCallback(() => {
    if (loading || loadingMoreRef.current) return;
    if (!lastUnitsKeyRef.current) return;
    if (units.length >= totalUnitsRef.current) return;
    loadingMoreRef.current = true;
    fetchUnits(loadedPagesRef.current + 1).finally(() => {
      loadingMoreRef.current = false;
    });
  }, [fetchUnits, loading, units.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUnits(1);
  }, [fetchUnits]);

  const handleUnitPress = useCallback(
    async (unit: UnitInfo) => {
      if (pressingUnitIndex !== null || !selectedSubject) return;
      setPressingUnitIndex(unit.unitIndex);
      const scope = {
        categoryId: selectedCategory?.id ?? null,
        subjectId: selectedSubject.id,
        gradeId: selectedGrade?.id ?? null,
        knowledgePointId: selectedKP?.id ?? null,
        tagIds: selectedTagIds,
      };
      try {
        let previousRecord: StudyRecordSummary | null = null;
        try {
          previousRecord = (
            await api.startStudy({ ...scope, unitIndex: unit.unitIndex })
          ).previous;
        } catch {
          // silently proceed
        }
        const result = await dispatch(
          fetchQuestions({
            categoryId: scope.categoryId ?? undefined,
            unitIndex: unit.unitIndex,
            subjectId: scope.subjectId,
            gradeId: scope.gradeId ?? undefined,
            knowledgePointId: scope.knowledgePointId ?? undefined,
            tagIds: scope.tagIds,
          })
        );
        if (fetchQuestions.fulfilled.match(result)) {
          navigation.navigate('Quiz', {
            categoryId: scope.categoryId ?? undefined,
            unitIndex: unit.unitIndex,
            categoryName: selectedCategory?.name,
            subjectId: scope.subjectId,
            gradeId: scope.gradeId ?? undefined,
            knowledgePointId: scope.knowledgePointId ?? undefined,
            tagIds: scope.tagIds,
            subjectName: selectedSubject.name,
            knowledgePointName: selectedKP?.name,
            previousRecord,
          });
        }
      } finally {
        setPressingUnitIndex(null);
      }
    },
    [pressingUnitIndex, selectedCategory, selectedSubject, selectedGrade, selectedKP, selectedTagIds, dispatch, navigation]
  );

  // 全局学习范围变更后持久化，首页/教材/记录页共用
  const handleSelectGrade = useCallback(
    (grade: Grade | null) => {
      setSelectedGrade(grade);
      dispatch(updateSettings({ gradeId: grade?.id ?? null }));
    },
    [dispatch]
  );

  const handleSelectSubject = useCallback(
    (subject: Subject | null) => {
      setSelectedSubject(subject);
      dispatch(updateSettings({ subjectId: subject?.id ?? null }));
    },
    [dispatch]
  );

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: UnitInfo }) => (
      <UnitItem
        unit={item}
        onPress={handleUnitPress}
        loading={pressingUnitIndex === item.unitIndex}
        disabled={pressingUnitIndex !== null}
      />
    ),
    [handleUnitPress, pressingUnitIndex]
  );

  const contentContainerStyle = useMemo(
    () => [styles.list, { padding: 16 * spacing, paddingTop: 8 * spacing, paddingBottom: 24 * spacing }],
    [spacing]
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
        <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>📋</Text>
        <Text style={[styles.emptyText, { color: colors.textTertiary, fontSize: 16 * font }]}>
          {selectedSubject && selectedKP ? t.studyNoUnits : t.studySelectAllFilters}
        </Text>
      </View>
    ),
    [spacing, font, colors.textTertiary, selectedSubject, selectedKP, t.studyNoUnits, t.studySelectAllFilters]
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />,
    [refreshing, onRefresh, colors.accent]
  );

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {textbookAvailable && (
        <TouchableOpacity
          style={[
            styles.textbookEntry,
            {
              marginHorizontal: 16 * spacing,
              marginTop: 8 * spacing,
              backgroundColor: colors.surface,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Textbook')}
        >
          <View
            style={[
              styles.textbookEntryIcon,
              { backgroundColor: colors.background, borderRadius: 10 * spacing },
            ]}
          >
            <Ionicons name="library-outline" size={20 * font} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '600', flex: 1 }}>
            {t.textbookTitle}
          </Text>
          <Ionicons name="chevron-forward" size={18 * font} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
      <StudyFilterBar
        categories={categories}
        subjects={subjects}
        selectedCategory={selectedCategory}
        selectedSubject={selectedSubject}
        selectedKP={selectedKP}
        onSelectCategory={setSelectedCategory}
        onSelectSubject={handleSelectSubject}
        onSelectKP={setSelectedKP}
        grades={grades}
        selectedGrade={selectedGrade}
        onSelectGrade={handleSelectGrade}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
        loading={initialLoading}
        allowClear
        categoryDisabled={!selectedSubject}
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
          contentContainerStyle={contentContainerStyle}
          refreshControl={refreshControl}
          ListEmptyComponent={listEmptyComponent}
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
  list: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
  textbookEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  textbookEntryIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});

export default StudyScreen;
