import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { FavoriteItem, Grade, Subject } from '@sharp/shared';
import { QuestionType } from '@sharp/shared';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import RichTextView from '../../components/RichTextView';
import ScopeSelectorHeader from '../../components/ScopeSelectorHeader';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';
import type { ThemeColors } from '../../theme/colors';
import { formatDate } from '../../utils/datetime';
import { htmlToText } from '../../utils/richText';

const PAGE_SIZE = 20;

const keyExtractor = (item: FavoriteItem) => item.questionId;

interface FavoriteCardProps {
  item: FavoriteItem;
  index: number;
  expanded: boolean;
  colors: ThemeColors;
  spacing: number;
  font: number;
  radius: number;
  analysisLabel: string;
  noteLabel: string;
  favoritedLabel: string;
  difficultyLabel: string;
  questionTypeLabel: string;
  /** 无障碍/提示文案：取消收藏 */
  removeLabel: string;
  onToggle: (questionId: string) => void;
  onRemove: (questionId: string) => void;
}

const FavoriteCard = memo(function FavoriteCard({
  item,
  index,
  expanded,
  colors,
  spacing,
  font,
  radius,
  analysisLabel,
  noteLabel,
  favoritedLabel,
  difficultyLabel,
  questionTypeLabel,
  removeLabel,
  onToggle,
  onRemove,
}: FavoriteCardProps) {
  const question = item.question;
  const sortedOptions = useMemo(
    () => [...question.options].sort((a, b) => a.sortNo - b.sortNo),
    [question.options]
  );
  const chapterLabel = question.chapter
    ? `${question.chapter.textbookName ? `${question.chapter.textbookName} · ` : ''}${question.chapter.name}`
    : null;

  return (
    <View style={[styles.questionCard, { backgroundColor: colors.surface, borderRadius: 12 * radius, marginBottom: 10 * spacing }]}>
      <View style={[styles.questionHeader, { padding: 14 * spacing }]}>
        <TouchableOpacity
          style={styles.questionHeaderMain}
          onPress={() => onToggle(item.questionId)}
          activeOpacity={0.7}
        >
          <View style={[styles.questionIndex, { backgroundColor: colors.accentLight, width: 28 * spacing, height: 28 * spacing, borderRadius: 14 * spacing, marginRight: 10 * spacing }]}>
            <Text style={[styles.questionIndexText, { color: colors.accentStrong, fontSize: 12 * font }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.questionContent, { color: colors.textSecondary, fontSize: 14 * font, lineHeight: 20 * font }]} numberOfLines={2}>
            {htmlToText(question.content)}
          </Text>
          <Text style={[styles.expandIcon, { color: colors.textTertiary, fontSize: 12 * font, marginLeft: 8 * spacing }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onRemove(item.questionId)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          style={[styles.removeButton, { marginLeft: 8 * spacing, padding: 4 * spacing }]}
        >
          <Ionicons name="star" size={20 * font} color={colors.accentStrong} />
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={[styles.questionDetail, { borderTopColor: colors.borderLight, paddingHorizontal: 14 * spacing, paddingBottom: 14 * spacing, paddingTop: 12 * spacing }]}>
          <View style={styles.metaRow}>
            <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
              {favoritedLabel}
            </Text>
            {!!chapterLabel && (
              <Text style={{ color: colors.textTertiary, fontSize: 12 * font, flexShrink: 1, marginLeft: 8 * spacing }} numberOfLines={1}>
                {chapterLabel}
              </Text>
            )}
          </View>

          <View style={{ marginTop: 8 * spacing }}>
            {sortedOptions.map((option) => (
              <View
                key={option.id}
                style={[
                  styles.optionRow,
                  { paddingVertical: 8 * spacing, paddingHorizontal: 10 * spacing, borderRadius: 12 * radius, marginBottom: 4 * spacing },
                  option.isCorrect && { backgroundColor: colors.accentLight },
                ]}
              >
                <Text
                  style={[
                    styles.optionKey,
                    { color: colors.textSecondary, width: 24 * spacing, height: 24 * spacing, borderRadius: 12 * spacing, lineHeight: 22 * spacing, fontSize: 12 * font, marginRight: 10 * spacing },
                    option.isCorrect && { borderColor: colors.success, color: colors.success },
                  ]}
                >
                  {option.optionKey}
                </Text>
                <RichTextView
                  html={option.content}
                  fontSize={14 * font}
                  lineHeight={20 * font}
                  color={option.isCorrect ? colors.successText : colors.textSecondary}
                  containerStyle={{ flex: 1 }}
                />
                {option.isCorrect && (
                  <Text style={[styles.correctMark, { color: colors.success, fontSize: 14 * font, marginLeft: 8 * spacing }]}>✓</Text>
                )}
              </View>
            ))}
          </View>

          {!!item.note && (
            <View style={[styles.noteBox, { borderColor: colors.borderLight, backgroundColor: colors.surfaceSecondary, marginTop: 10 * spacing, padding: 12 * spacing, borderRadius: 8 * radius }]}>
              <Text style={[styles.analysisLabel, { color: colors.textSecondary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{noteLabel}</Text>
              <Text style={{ color: colors.text, fontSize: 14 * font, lineHeight: 20 * font }}>{item.note}</Text>
            </View>
          )}

          {!!question.analysis && (
            <View style={[styles.analysisBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary, marginTop: 10 * spacing, padding: 12 * spacing, borderRadius: 8 * radius }]}>
              <Text style={[styles.analysisLabel, { color: colors.primary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{analysisLabel}</Text>
              <RichTextView
                html={question.analysis}
                fontSize={13 * font}
                lineHeight={20 * font}
                color={colors.textSecondary}
                style={styles.analysisText}
              />
            </View>
          )}

          <View style={[styles.difficultyRow, { marginTop: 10 * spacing }]}>
            <View style={styles.difficultyLeft}>
              <Text style={[styles.difficultyLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>{difficultyLabel}</Text>
              {Array.from({ length: 5 }, (_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.difficultyStar,
                    { fontSize: 14 * font, marginRight: 2 * spacing, color: i < question.difficulty ? '#F59E0B' : colors.border },
                  ]}
                >
                  ★
                </Text>
              ))}
            </View>
            <Text style={[styles.questionType, { color: colors.textTertiary, fontSize: 12 * font }]}>
              {questionTypeLabel}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId, subjectId } = useSelector((state: RootState) => state.settings);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [removeError, setRemoveError] = useState(false);
  // 默认跟随导航栏的全局范围，可临时切到「全部收藏」（仅本页生效）
  const [followScope, setFollowScope] = useState(true);
  const mountedRef = useRef(true);
  const removeErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scopeActive = Boolean(gradeId || subjectId);
  const filtered = followScope && scopeActive;

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjects, subjectId],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (removeErrorTimerRef.current) clearTimeout(removeErrorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [gradeList, subjectList] = await Promise.all([api.getGrades(), api.getSubjects()]);
        setGrades(gradeList);
        setSubjects(subjectList);
      } catch {
        // 选择器字典失败不阻塞列表
      }
    })();
  }, []);

  const handleChangeGrade = useCallback(
    (grade: Grade | null) => {
      dispatch(updateSettings({ gradeId: grade?.id ?? null }));
    },
    [dispatch],
  );

  const handleChangeSubject = useCallback(
    (subject: Subject | null) => {
      dispatch(updateSettings({ subjectId: subject?.id ?? null }));
    },
    [dispatch],
  );

  // 选择器居中显示在原生 header，与错题本一致
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ScopeSelectorHeader
          grades={grades}
          subjects={subjects}
          selectedGrade={selectedGrade}
          selectedSubject={selectedSubject}
          onChangeGrade={handleChangeGrade}
          onChangeSubject={handleChangeSubject}
        />
      ),
    });
  }, [
    navigation,
    grades,
    subjects,
    selectedGrade,
    selectedSubject,
    handleChangeGrade,
    handleChangeSubject,
  ]);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await api.getFavorites({
          page: targetPage,
          pageSize: PAGE_SIZE,
          gradeId: filtered ? gradeId : null,
          subjectId: filtered ? subjectId : null,
        });
        if (!mountedRef.current) return;
        setItems((prev) => (append ? [...prev, ...data.data] : data.data));
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setLoadFailed(false);
        if (!append) setExpandedIds({});
      } catch {
        if (!mountedRef.current) return;
        if (!append) {
          setItems([]);
          setTotal(0);
          setLoadFailed(true);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [filtered, gradeId, subjectId],
  );

  // 每次获得焦点或范围变化都重新拉第一页：答题页刚收藏的题目回来即可见
  useFocusEffect(
    useCallback(() => {
      void load(1, false);
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(1, false);
  }, [load]);

  const onEndReached = useCallback(() => {
    if (loadingMore || loading || page >= totalPages) return;
    void load(page + 1, true);
  }, [loadingMore, loading, page, totalPages, load]);

  const toggleExpand = useCallback((questionId: string) => {
    setExpandedIds((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const handleRemove = useCallback(
    (questionId: string) => {
      const snapshot = items;
      setItems((prev) => prev.filter((item) => item.questionId !== questionId));
      setTotal((n) => Math.max(0, n - 1));
      api.removeFavorite(questionId).catch(() => {
        if (!mountedRef.current) return;
        setItems(snapshot);
        setTotal((n) => n + 1);
        setRemoveError(true);
        if (removeErrorTimerRef.current) clearTimeout(removeErrorTimerRef.current);
        removeErrorTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setRemoveError(false);
        }, 2400);
      });
    },
    [items],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FavoriteItem; index: number }) => {
      const type = item.question.type;
      return (
        <FavoriteCard
          item={item}
          index={index}
          expanded={!!expandedIds[item.questionId]}
          colors={colors}
          spacing={spacing}
          font={font}
          radius={radius}
          analysisLabel={t.analysis}
          noteLabel={t.favoritesNote}
          favoritedLabel={t.favoritesFavoritedAt(formatDate(item.createdAt))}
          difficultyLabel={t.difficultyLabel}
          questionTypeLabel={
            type === QuestionType.MULTIPLE_CHOICE
              ? t.multipleChoice
              : type === QuestionType.TRUE_FALSE
                ? t.judgement
                : t.singleChoice
          }
          removeLabel={t.favoriteRemove}
          onToggle={toggleExpand}
          onRemove={handleRemove}
        />
      );
    },
    [expandedIds, colors, spacing, font, radius, t.analysis, t.favoritesNote, t.favoritesFavoritedAt, t.difficultyLabel, t.multipleChoice, t.judgement, t.singleChoice, t.favoriteRemove, toggleExpand, handleRemove]
  );

  const contentContainerStyle = useMemo(
    () => [styles.list, { paddingHorizontal: 16 * spacing, paddingTop: 0, paddingBottom: 24 * spacing }],
    [spacing]
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />,
    [refreshing, onRefresh, colors.primary]
  );

  const listHeader = useMemo(
    () => (
      <View style={{ marginBottom: 10 * spacing }}>
        {scopeActive && (
          <View style={[styles.scopeRow, { marginBottom: 10 * spacing }]}>
            <TouchableOpacity
              onPress={() => setFollowScope(true)}
              style={[
                styles.scopeChip,
                { paddingHorizontal: 12 * spacing, paddingVertical: 6 * spacing, borderRadius: 999 },
                filtered
                  ? { backgroundColor: colors.accentLight, borderColor: colors.accent }
                  : { borderColor: colors.border },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ color: filtered ? colors.accentStrong : colors.textSecondary, fontSize: 13 * font, fontWeight: '600' }}>
                {t.favoritesScopeCurrent}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFollowScope(false)}
              style={[
                styles.scopeChip,
                { marginLeft: 8 * spacing, paddingHorizontal: 12 * spacing, paddingVertical: 6 * spacing, borderRadius: 999 },
                !filtered
                  ? { backgroundColor: colors.accentLight, borderColor: colors.accent }
                  : { borderColor: colors.border },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ color: !filtered ? colors.accentStrong : colors.textSecondary, fontSize: 13 * font, fontWeight: '600' }}>
                {t.favoritesScopeAll}
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textTertiary, fontSize: 12 * font, marginLeft: 'auto' }}>
              {t.favoritesCount(total)}
            </Text>
          </View>
        )}
        {!scopeActive && total > 0 && (
          <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
            {t.favoritesCount(total)}
          </Text>
        )}
        {removeError && (
          <Text style={{ color: colors.error, fontSize: 12 * font, marginTop: 6 * spacing, textAlign: 'right' }}>
            {t.favoritesRemoveFailed}
          </Text>
        )}
      </View>
    ),
    [scopeActive, filtered, total, removeError, spacing, font, colors, t.favoritesScopeCurrent, t.favoritesScopeAll, t.favoritesCount, t.favoritesRemoveFailed]
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) return null;
    if (loadFailed) {
      return (
        <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
          <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>📡</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font, marginBottom: 4 * spacing }]}>{t.favoritesLoadFailed}</Text>
          <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 14 * font, marginBottom: 16 * spacing }]}>{t.favoritesLoadFailedSub}</Text>
          <TouchableOpacity
            onPress={() => void load(1, false)}
            style={[styles.retryButton, { borderColor: colors.accent, paddingHorizontal: 20 * spacing, paddingVertical: 8 * spacing, borderRadius: 999 }]}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '600' }}>{t.favoritesRetry}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const isFilteredEmpty = filtered;
    return (
      <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
        <Ionicons name="star-outline" size={44 * font} color={colors.accent} style={{ marginBottom: 12 * spacing }} />
        <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font, marginBottom: 4 * spacing }]}>
          {isFilteredEmpty ? t.favoritesEmptyFiltered : t.favoritesEmpty}
        </Text>
        <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 14 * font }]}>
          {isFilteredEmpty ? t.favoritesEmptyFilteredSub : t.favoritesEmptySub}
        </Text>
        {isFilteredEmpty && (
          <TouchableOpacity
            onPress={() => setFollowScope(false)}
            style={[styles.retryButton, { borderColor: colors.accent, marginTop: 16 * spacing, paddingHorizontal: 20 * spacing, paddingVertical: 8 * spacing, borderRadius: 999 }]}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '600' }}>{t.favoritesScopeAll}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, loadFailed, filtered, colors, spacing, font, t.favoritesLoadFailed, t.favoritesLoadFailedSub, t.favoritesRetry, t.favoritesEmpty, t.favoritesEmptySub, t.favoritesEmptyFiltered, t.favoritesEmptyFilteredSub, t.favoritesScopeAll, load]);

  if (loading && items.length === 0 && !loadFailed) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={items.length > 0 ? listHeader : null}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 12 * spacing, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : page < totalPages ? (
            <View style={{ paddingVertical: 12 * spacing, alignItems: 'center' }}>
              <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>{t.favoritesLoadMore}</Text>
            </View>
          ) : null
        }
        refreshControl={refreshControl}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
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
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scopeChip: {
    borderWidth: 1,
  },
  questionCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  questionHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionIndexText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionContent: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  removeButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionKey: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 10,
    overflow: 'hidden',
  },
  correctMark: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  noteBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  analysisBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  analysisLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 20,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  difficultyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 12,
  },
  difficultyStar: {
    fontSize: 14,
    marginRight: 2,
  },
  questionType: {
    fontSize: 12,
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
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
  },
  retryButton: {
    borderWidth: 1,
    alignItems: 'center',
  },
});

export default FavoritesScreen;
