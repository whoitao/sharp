import { Ionicons } from '@expo/vector-icons';
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
import { cardShadow } from '../../theme/shadows';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Records'>;
type TabKey = 'time' | 'chapter' | 'knowledge';

interface RecordsScreenProps {
  navigation: NavigationProp;
}

const RecordsScreen: React.FC<RecordsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
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
          subjectId: subjectId ?? undefined,
          gradeId: gradeId ?? undefined,
        });
        if (pageNum === 1) setRecords(response.data);
        else setRecords((prev) => [...prev, ...response.data]);
        setTotalPages(response.totalPages);
        setPage(pageNum);
      } catch {
        // keep existing data
      }
    },
    [subjectId, gradeId],
  );

  const fetchOverview = useCallback(async () => {
    try {
      const overview = await api.getStats();
      setStats(overview);
    } catch {
      // keep existing data
    }
  }, []);

  // 年级 / 科目字典只拉一次，避免与数据加载 effect 形成相互触发
  useEffect(() => {
    (async () => {
      try {
        const [subs, gradeList] = await Promise.all([api.getSubjects(), api.getGrades()]);
        setSubjects(subs);
        setGrades(gradeList);
      } catch {
        // ignore
      }
    })();
  }, []);

  // 首屏 / 范围变化：总览 + 时间线
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchRecords(1)]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
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
            { backgroundColor: colors.borderLight, height: 4, borderRadius: 2, marginBottom: 8 * spacing },
          ]}
        >
          <View
            style={{
              width: `${ratio * 100}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.accent,
            }}
          />
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statHint, { color: colors.textTertiary, fontSize: 11.5 * font }]}>
            {t.statsProgress(answered, total)}
          </Text>
          <Text style={[styles.statHint, { color: colors.textTertiary, fontSize: 11.5 * font }]}>
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
        cardShadow(isDark),
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: 12 * spacing,
          borderRadius: 12 * radius,
          marginBottom: 9 * spacing,
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
          <Text style={[styles.statHint, { color: colors.textTertiary, fontSize: 11.5 * font }]}>
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

  const renderKnowledgeTree = () => {
    const rows = flattenKnowledgePoints(kpStats);
    return (
      <View
        style={[
          styles.kpTable,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: 12 * radius,
          },
        ]}
      >
        {rows.map(({ node, depth }, index) => {
          const accuracy =
            node.answeredQuestions > 0
              ? Math.round((node.correctQuestions / node.answeredQuestions) * 100)
              : 0;
          return (
            <View
              key={node.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12 * spacing,
                paddingLeft: (12 + depth * 12) * spacing,
                paddingRight: 12 * spacing,
                borderBottomWidth: index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: (depth === 0 ? 14 : 13) * font,
                  fontWeight: depth === 0 ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {node.name}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11 * font,
                  marginLeft: 6 * spacing,
                }}
              >
                {node.answeredQuestions}/{node.totalQuestions}
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11 * font,
                  marginLeft: 6 * spacing,
                  minWidth: 34,
                  textAlign: 'right',
                }}
              >
                {accuracy}%
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: StudyRecord }) => {
    const percentage =
      item.totalQuestions > 0
        ? Math.round((item.correctCount / item.totalQuestions) * 100)
        : 0;

    return (
      <TouchableOpacity
        style={[
          styles.recordCard,
          cardShadow(isDark),
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: 12 * spacing,
            borderRadius: 12 * radius,
            marginBottom: 9 * spacing,
          },
        ]}
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
        <View style={[styles.recordHeader, { marginBottom: 10 * spacing }]}>
          <Text style={[styles.recordDate, { color: colors.textSecondary, fontSize: 13 * font }]}>{formatDate(item.startedAt)}</Text>
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  percentage >= 80
                    ? colors.accentLight
                    : percentage >= 60
                      ? colors.warningLight
                      : colors.errorLight,
                paddingHorizontal: 8 * spacing,
                paddingVertical: 3 * spacing,
                borderRadius: 10 * radius,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreBadgeText,
                {
                  fontSize: 12 * font,
                  color:
                    percentage >= 80
                      ? colors.accent
                      : percentage >= 60
                        ? colors.warning
                        : colors.error,
                },
              ]}
            >
              {percentage}%
            </Text>
          </View>
        </View>
        <View style={styles.recordBody}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font, marginBottom: 3 * spacing }]}>{t.statQuestions}</Text>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 15 * font }]}>{item.totalQuestions}</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font, marginBottom: 3 * spacing }]}>{t.statCorrect}</Text>
            <Text style={[styles.recordStatValue, { color: colors.accent, fontSize: 15 * font }]}>
              {item.correctCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font, marginBottom: 3 * spacing }]}>{t.statWrong}</Text>
            <Text style={[styles.recordStatValue, { color: colors.error, fontSize: 15 * font }]}>
              {item.wrongCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font, marginBottom: 3 * spacing }]}>{t.statDuration}</Text>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 15 * font }]}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsBody = () => {
    if (tab === 'chapter') {
      if (!textbookId) {
        return (
          <View style={[styles.empty, { paddingTop: 48 * spacing }]}>
            <Ionicons
              name="library-outline"
              size={40 * font}
              color={colors.textTertiary}
              style={{ marginBottom: 12 * spacing }}
            />
            <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 14 * font, textAlign: 'center' }]}>
              {t.statsSelectTextbook}
            </Text>
          </View>
        );
      }
      if (chapterStats.length === 0) {
        return (
          <View style={[styles.empty, { paddingTop: 48 * spacing }]}>
            <Ionicons
              name="bar-chart-outline"
              size={40 * font}
              color={colors.textTertiary}
              style={{ marginBottom: 12 * spacing }}
            />
            <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 14 * font }]}>
              {t.statsNoChapterData}
            </Text>
          </View>
        );
      }
      return <View style={{ padding: 16 * spacing, paddingTop: 12 * spacing }}>{chapterStats.map(renderChapterItem)}</View>;
    }

    if (kpStats.length === 0) {
      return (
        <View style={[styles.empty, { paddingTop: 48 * spacing }]}>
          <Ionicons
            name="bar-chart-outline"
            size={40 * font}
            color={colors.textTertiary}
            style={{ marginBottom: 12 * spacing }}
          />
          <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 14 * font }]}>
            {t.statsNoKnowledgeData}
          </Text>
        </View>
      );
    }
    return (
      <View style={{ padding: 16 * spacing, paddingTop: 12 * spacing }}>
        {renderKnowledgeTree()}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* 今日概览 + 累计指标 */}
      <View
        style={[
          styles.overviewCard,
          cardShadow(isDark),
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            marginHorizontal: 16 * spacing,
            marginTop: 0,
            padding: 12 * spacing,
            borderRadius: 12 * radius,
          },
        ]}
      >
        {!!stats && stats.streak > 0 && (
          <View
            style={[
              styles.streakRow,
              { marginBottom: 8 * spacing, marginRight: 4 * spacing },
            ]}
          >
            <Ionicons name="flame" size={12 * font} color={colors.accent} />
            <Text
              style={[styles.streak, { color: colors.accent, fontSize: 11.5 * font, marginLeft: 3 * spacing }]}
            >
              {t.statsStreakDays(stats.streak)}
            </Text>
          </View>
        )}
        <View style={styles.overviewRow}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 18 * font }]}>
              {today?.questionsAnswered ?? 0}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font }]}>
              {t.statsTodayQuestions}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 18 * font }]}>
              {today?.sessionsCompleted ?? 0}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font }]}>
              {t.statsTodaySessions}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 18 * font }]}>
              {formatDuration(today?.studyDuration ?? 0)}
            </Text>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 11.5 * font }]}>
              {t.statsTodayDuration}
            </Text>
          </View>
        </View>
        <View style={[styles.overviewDivider, { backgroundColor: colors.borderLight, marginVertical: 12 * spacing }]} />
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
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16 * spacing,
          marginTop: 8 * spacing,
          padding: 3 * spacing,
          borderRadius: 10 * radius,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
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
                  backgroundColor: active ? colors.surface : 'transparent',
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
                    fontSize: 14 * font,
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
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { padding: 16 * spacing, paddingTop: 12 * spacing, paddingBottom: 24 * spacing }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
                <Ionicons
                  name="bar-chart-outline"
                  size={44 * font}
                  color={colors.textTertiary}
                  style={{ marginBottom: 12 * spacing }}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 15 * font, marginBottom: 4 * spacing }]}>{t.recordsEmpty}</Text>
                <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 13 * font }]}>{t.recordsEmptySub}</Text>
              </View>
            }
            ListFooterComponent={
              loading && records.length > 0 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.accent} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  kpTable: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    includeFontPadding: false,
  },
  statCard: {
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
