import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  ChapterStudyStat,
  Grade,
  KnowledgePointStudyStat,
  StudyRecord,
  StudyStatsOverview,
  Subject,
} from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScopeSelector from '../../components/ScopeSelector';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Records'>;
type TabKey = 'time' | 'chapter' | 'knowledge';

interface RecordsScreenProps {
  navigation: NavigationProp;
}

const RecordsScreen: React.FC<RecordsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId, subjectId, textbookId } = useSelector((state: RootState) => state.settings);

  const [tab, setTab] = useState<TabKey>('time');
  const [stats, setStats] = useState<StudyStatsOverview | null>(null);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [chapterStats, setChapterStats] = useState<ChapterStudyStat[]>([]);
  const [kpStats, setKpStats] = useState<KnowledgePointStudyStat[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 年级 / 科目来自 header 的全局选择器
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjects, subjectId],
  );

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

  const fetchRecords = useCallback(
    async (pageNum: number = 1) => {
      try {
        const response = await api.getStudyRecords({
          page: pageNum,
          pageSize: 20,
          subjectId: selectedSubject?.id,
          gradeId: selectedGrade?.id,
        });
        if (pageNum === 1) setRecords(response.data);
        else setRecords((prev) => [...prev, ...response.data]);
        setTotalPages(response.totalPages);
        setPage(pageNum);
      } catch {
        // keep existing data
      }
    },
    [selectedSubject, selectedGrade],
  );

  const fetchOverview = useCallback(async () => {
    try {
      const overview = await api.getStats();
      setStats(overview);
    } catch {
      // keep existing data
    }
  }, []);

  // 首屏：总览 + 时间线
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [subs, gradeList] = await Promise.all([api.getSubjects(), api.getGrades()]);
        setSubjects(subs);
        setGrades(gradeList);
      } catch {
        // ignore
      }
      await Promise.all([fetchOverview(), fetchRecords(1)]);
      setLoading(false);
    })();
  }, [fetchOverview, fetchRecords]);

  // 按章节：依赖「我的教材」
  useEffect(() => {
    if (tab !== 'chapter' || !textbookId) {
      setChapterStats([]);
      return;
    }
    (async () => {
      const data = await api.getChapterStats(textbookId);
      setChapterStats(data);
    })();
  }, [tab, textbookId]);

  // 按知识点：依赖学段 + 科目
  useEffect(() => {
    if (tab !== 'knowledge') return;
    (async () => {
      const data = await api.getKnowledgePointStats({
        stageId: selectedGrade?.stageId ?? null,
        subjectId: selectedSubject?.id ?? null,
      });
      setKpStats(data);
    })();
  }, [tab, selectedGrade, selectedSubject]);

  // 全局「年级 + 科目」选择器固定在原生 header 右侧
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginRight: 16 }}>
          <ScopeSelector
            grades={grades}
            subjects={subjects}
            selectedGrade={selectedGrade}
            selectedSubject={selectedSubject}
            onChangeGrade={handleChangeGrade}
            onChangeSubject={handleChangeSubject}
          />
        </View>
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchOverview(),
      fetchRecords(1),
      tab === 'chapter' && textbookId ? api.getChapterStats(textbookId).then(setChapterStats) : null,
      tab === 'knowledge'
        ? api
            .getKnowledgePointStats({
              stageId: selectedGrade?.stageId ?? null,
              subjectId: selectedSubject?.id ?? null,
            })
            .then(setKpStats)
        : null,
    ]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      fetchRecords(page + 1);
    }
  };

  const handleRecordPress = (record: StudyRecord) => {
    navigation.navigate('QuizResult', {
      chapterId: record.chapterId ?? undefined,
      chapterName: record.chapterName ?? undefined,
      textbookLabel: record.textbookLabel ?? undefined,
      unitIndex: record.unitIndex,
      subjectId: record.subjectId ?? undefined,
      gradeId: record.gradeId ?? undefined,
      knowledgePointId: record.knowledgePointId ?? undefined,
      record,
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${t.monthDay(month, day)} ${t.clockTime(hours, minutes)}`;
  };

  const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return t.monthDay(date.getMonth() + 1, date.getDate());
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}${t.minuteShort}${secs}${t.secondShort}`;
    return `${secs}${t.secondShort}`;
  };

  const today = stats?.recentStats.find(
    (item) => new Date(item.date).toDateString() === new Date().toDateString(),
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'time', label: t.statsTabTime },
    { key: 'chapter', label: t.statsTabChapter },
    { key: 'knowledge', label: t.statsTabKnowledge },
  ];

  const renderProgress = (answered: number, correct: number, total: number) => {
    const ratio = total > 0 ? Math.min(1, answered / total) : 0;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return (
      <View>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.border, height: 6, borderRadius: 3, marginBottom: 6 * spacing },
          ]}
        >
          <View
            style={{
              width: `${ratio * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statHint, { color: colors.textSecondary, fontSize: 12 * font }]}>
            {t.statsProgress(answered, total)}
          </Text>
          <Text style={[styles.statHint, { color: colors.textSecondary, fontSize: 12 * font }]}>
            {t.statsAccuracyLabel} {accuracy}%
          </Text>
        </View>
      </View>
    );
  };

  const renderChapterItem = (item: ChapterStudyStat) => (
    <View
      key={item.id}
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          padding: 16 * spacing,
          borderRadius: 12 * radius,
          marginBottom: 10 * spacing,
        },
      ]}
    >
      <View style={[styles.statHeader, { marginBottom: 10 * spacing }]}>
        <Text
          style={[styles.statName, { color: colors.text, fontSize: 15 * font }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {!!item.lastPracticedAt && (
          <Text style={[styles.statHint, { color: colors.textTertiary, fontSize: 12 * font }]}>
            {t.statsLastPracticed(formatShortDate(item.lastPracticedAt))}
          </Text>
        )}
      </View>
      {renderProgress(item.answeredQuestions, item.correctQuestions, item.totalQuestions)}
    </View>
  );

  const flattenKnowledgePoints = (
    nodes: KnowledgePointStudyStat[],
    depth = 0,
  ): { node: KnowledgePointStudyStat; depth: number }[] =>
    nodes.flatMap((node) => [
      { node, depth },
      ...flattenKnowledgePoints(node.children ?? [], depth + 1),
    ]);

  const renderKnowledgeItem = ({
    node,
    depth,
  }: {
    node: KnowledgePointStudyStat;
    depth: number;
  }) => (
    <View
      key={node.id}
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          padding: 14 * spacing,
          borderRadius: 12 * radius,
          marginBottom: 8 * spacing,
          marginLeft: depth > 0 ? 14 * depth * spacing : 0,
        },
      ]}
    >
      <View style={[styles.statHeader, { marginBottom: 8 * spacing }]}>
        <Text
          style={[
            styles.statName,
            { color: colors.text, fontSize: (depth === 0 ? 15 : 14) * font },
          ]}
          numberOfLines={1}
        >
          {node.name}
        </Text>
        {!!node.lastPracticedAt && (
          <Text style={[styles.statHint, { color: colors.textTertiary, fontSize: 12 * font }]}>
            {t.statsLastPracticed(formatShortDate(node.lastPracticedAt))}
          </Text>
        )}
      </View>
      {renderProgress(node.answeredQuestions, node.correctQuestions, node.totalQuestions)}
    </View>
  );

  const renderItem = ({ item }: { item: StudyRecord }) => {
    const percentage =
      item.totalQuestions > 0
        ? Math.round((item.correctCount / item.totalQuestions) * 100)
        : 0;

    return (
      <TouchableOpacity
        style={[styles.recordCard, { backgroundColor: colors.surface, padding: 16 * spacing, borderRadius: 12 * radius, marginBottom: 10 * spacing }]}
        onPress={() => handleRecordPress(item)}
        activeOpacity={0.7}
      >
        {!!item.chapterName && (
          <Text
            style={[
              styles.recordSource,
              { color: colors.text, fontSize: 13 * font, marginBottom: 8 * spacing },
            ]}
            numberOfLines={1}
          >
            {[item.textbookLabel, item.chapterName].filter(Boolean).join(' · ')}
          </Text>
        )}
        <View style={[styles.recordHeader, { marginBottom: 14 * spacing }]}>
          <Text style={[styles.recordDate, { color: colors.textSecondary, fontSize: 14 * font }]}>{formatDate(item.startedAt)}</Text>
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  percentage >= 80 ? colors.accentLight : percentage >= 60 ? '#FEF3C7' : colors.errorLight,
                paddingHorizontal: 10 * spacing,
                paddingVertical: 4 * spacing,
                borderRadius: 12 * radius,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreBadgeText,
                {
                  fontSize: 13 * font,
                  color:
                    percentage >= 80 ? colors.accent : percentage >= 60 ? '#D97706' : colors.error,
                },
              ]}
            >
              {percentage}%
            </Text>
          </View>
        </View>
        <View style={styles.recordBody}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statQuestions}</Text>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 16 * font }]}>{item.totalQuestions}</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statCorrect}</Text>
            <Text style={[styles.recordStatValue, { color: colors.accent, fontSize: 16 * font }]}>
              {item.correctCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statWrong}</Text>
            <Text style={[styles.recordStatValue, { color: colors.error, fontSize: 16 * font }]}>
              {item.wrongCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statDuration}</Text>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 16 * font }]}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsBody = () => {
    if (tab === 'chapter') {
      if (!textbookId) {
        return (
          <View style={[styles.empty, { paddingTop: 40 * spacing }]}>
            <Text style={[styles.emptyIcon, { fontSize: 40 * font, marginBottom: 12 * spacing }]}>📚</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 14 * font, textAlign: 'center' }]}>
              {t.statsSelectTextbook}
            </Text>
          </View>
        );
      }
      if (chapterStats.length === 0) {
        return (
          <View style={[styles.empty, { paddingTop: 40 * spacing }]}>
            <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 14 * font }]}>
              {t.statsNoChapterData}
            </Text>
          </View>
        );
      }
      return <View style={{ padding: 16 * spacing, paddingTop: 10 * spacing }}>{chapterStats.map(renderChapterItem)}</View>;
    }

    if (kpStats.length === 0) {
      return (
        <View style={[styles.empty, { paddingTop: 40 * spacing }]}>
          <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 14 * font }]}>
            {t.statsNoKnowledgeData}
          </Text>
        </View>
      );
    }
    return (
      <View style={{ padding: 16 * spacing, paddingTop: 10 * spacing }}>
        {flattenKnowledgePoints(kpStats).map(renderKnowledgeItem)}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* 今日概览 + 累计指标 */}
      <View
        style={[
          styles.overviewCard,
          {
            backgroundColor: colors.surface,
            marginHorizontal: 16 * spacing,
            marginTop: 12 * spacing,
            padding: 16 * spacing,
            borderRadius: 12 * radius,
          },
        ]}
      >
        <View style={[styles.statHeader, { marginBottom: 12 * spacing }]}>
          <Text style={[styles.overviewTitle, { color: colors.text, fontSize: 16 * font }]}>
            {t.statsToday}
          </Text>
          {!!stats && stats.streak > 0 && (
            <Text style={[styles.streak, { color: colors.accent, fontSize: 13 * font }]}>
              {t.statsStreakDays(stats.streak)}
            </Text>
          )}
        </View>
        <View style={styles.overviewRow}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 20 * font }]}>
              {today?.questionsAnswered ?? 0}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font }]}>
              {t.statsTodayQuestions}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 20 * font }]}>
              {today?.sessionsCompleted ?? 0}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font }]}>
              {t.statsTodaySessions}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 20 * font }]}>
              {formatDuration(today?.studyDuration ?? 0)}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font }]}>
              {t.statsTodayDuration}
            </Text>
          </View>
        </View>
        <View style={[styles.overviewDivider, { backgroundColor: colors.border, marginVertical: 12 * spacing }]} />
        <View style={styles.overviewRow}>
          <View style={styles.recordStat}>
            <Text style={[styles.overviewTotal, { color: colors.textSecondary, fontSize: 13 * font }]}>
              {stats?.totalDays ?? 0}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11 * font }]}>
              {t.statsTotalDays}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.overviewTotal, { color: colors.textSecondary, fontSize: 13 * font }]}>
              {stats?.totalQuestions ?? 0}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11 * font }]}>
              {t.statsTotalQuestions}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.overviewTotal, { color: colors.textSecondary, fontSize: 13 * font }]}>
              {stats?.accuracy ?? 0}%
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11 * font }]}>
              {t.statsAccuracy}
            </Text>
          </View>
        </View>
      </View>

      {/* 三视角切换 */}
      <View style={[styles.tabBar, { marginHorizontal: 16 * spacing, marginTop: 12 * spacing, marginBottom: 4 * spacing }]}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.tabItem,
                {
                  paddingVertical: 8 * spacing,
                  borderRadius: 8 * radius,
                  backgroundColor: active ? colors.accentLight : 'transparent',
                },
              ]}
              onPress={() => setTab(item.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? colors.accent : colors.textSecondary,
                    fontSize: 13 * font,
                    fontWeight: active ? '600' : '400',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'time' ? (
        loading && records.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { padding: 16 * spacing, paddingTop: 10 * spacing, paddingBottom: 24 * spacing }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
                <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>📊</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font, marginBottom: 4 * spacing }]}>{t.recordsEmpty}</Text>
                <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 14 * font }]}>{t.recordsEmptySub}</Text>
              </View>
            }
            ListFooterComponent={
              loading && records.length > 0 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        )
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 24 * spacing }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {renderStatsBody()}
        </ScrollView>
      )}
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
  scroll: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  overviewCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  overviewTitle: {
    fontWeight: '600',
  },
  streak: {
    fontWeight: '600',
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewDivider: {
    height: StyleSheet.hairlineWidth,
  },
  overviewTotal: {
    fontWeight: '600',
    marginBottom: 2,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    includeFontPadding: false,
  },
  statCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statName: {
    flex: 1,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statHint: {
    fontWeight: '400',
  },
  progressTrack: {
    overflow: 'hidden',
  },
  recordCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordSource: {
    fontWeight: '600',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  recordStat: {
    alignItems: 'center',
  },
  recordStatLabel: {
    fontSize: 12,
    marginBottom: 4,
    marginTop: 2,
  },
  recordStatValue: {
    fontSize: 16,
    fontWeight: '600',
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
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default RecordsScreen;
