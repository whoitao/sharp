import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  ChapterStudyStat,
  DailySeriesPoint,
  Grade,
  KnowledgePointStudyStat,
  StudyRecord,
  StudyStatsOverview,
  StudyStatsRangeKey,
  Subject,
} from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScopeSelectorHeader from '../../components/ScopeSelectorHeader';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';
import { cardShadow } from '../../theme/shadows';
import { formatDate, getDisplayParts } from '../../utils/datetime';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Records'>;
type TabKey = 'time' | 'chapter' | 'knowledge';
type ScopeKey = 'all' | NonNullable<StudyRecord['scopeType']>;

interface RecordsScreenProps {
  navigation: NavigationProp;
}

const RANGES: StudyStatsRangeKey[] = ['today', 'week', 'month', 'all'];
const SCOPES: ScopeKey[] = ['all', 'chapter', 'knowledge', 'bank'];
/** 分组后一屏可能只覆盖 1~2 天，30 条比原来的 20 条更容易凑满一组 */
const PAGE_SIZE = 30;

/**
 * 热力条色阶：token 里只有最浅（accentLight）与最深（accentStrong）两档绿，
 * 中间两档按主题各补一档，四格才看得出递进。
 */
const HEAT_LIGHT = ['#EDF3F0', '#DDF6EA', '#A7E8CC', '#4ED3A3', '#0B7F58'];
const HEAT_DARK = ['#1F2E27', '#123B2C', '#1A5C40', '#2A9D6E', '#34D399'];

/** YYYY-MM-DD（北京时间）→ 纪元日序号，用于算日差 */
const dayNumber = (dateStr: string): number => {
  const time = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Number.isNaN(time) ? 0 : Math.round(time / 86_400_000);
};

const heatLevel = (value: number, max: number): number => {
  if (value <= 0) return 0;
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 0.66) return 4;
  if (ratio > 0.33) return 3;
  if (ratio > 0.1) return 2;
  return 1;
};

/** 正确率上色：≥85 掌握良好 / 60~84 需要巩固 / <60 尚未掌握 / 未作答显示灰 */
const toneOf = (
  accuracy: number,
  started: boolean,
  colors: { success: string; warning: string; error: string; textTertiary: string },
): string => {
  if (!started) return colors.textTertiary;
  if (accuracy >= 85) return colors.success;
  if (accuracy >= 60) return colors.warning;
  return colors.error;
};

/** 空 / 错误 / 首次使用共用的居中状态卡 */
const StateCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, sub, actionLabel, onAction }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  return (
    <View style={styles.stateCard}>
      <Ionicons name={icon} size={36 * font} color={colors.textTertiary} />
      <Text style={{ color: colors.textSecondary, fontSize: 14 * font, marginTop: 10 * spacing }}>
        {title}
      </Text>
      {!!sub && (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 12.5 * font,
            marginTop: 4 * spacing,
            textAlign: 'center',
          }}
        >
          {sub}
        </Text>
      )}
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={[
            styles.ctaButton,
            {
              backgroundColor: colors.accent,
              borderRadius: 10 * radius,
              marginTop: 14 * spacing,
              paddingHorizontal: 20 * spacing,
              paddingVertical: 9 * spacing,
            },
          ]}
        >
          <Text style={{ color: colors.surface, fontSize: 14 * font, fontWeight: '600' }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

/** 小胶囊按钮行：口径分段与来源筛选共用外观，active 用浅底 + 深字 */
const ChipRow: React.FC<{
  items: { key: string; label: string }[];
  active: string;
  onSelect: (key: string) => void;
  pill?: boolean;
}> = ({ items, active, onSelect, pill }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            hitSlop={4}
            style={[
              pill ? styles.pill : styles.chip,
              {
                paddingVertical: (pill ? 5 : 6) * spacing,
                borderRadius: pill ? 999 : 8 * radius,
                borderColor: selected && pill ? colors.accent : 'transparent',
                backgroundColor: selected ? colors.accentLight : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: selected ? colors.accentStrong : colors.textSecondary,
                fontSize: (pill ? 12.5 : 13) * font,
                fontWeight: selected ? '600' : '400',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** C 三视角分段控件 */
const SegmentedTabs: React.FC<{ tab: TabKey; items: { key: TabKey; label: string }[]; onChange: (tab: TabKey) => void }> = ({
  tab,
  items,
  onChange,
}) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  return (
    <View
      style={[
        styles.segment,
        { padding: 3 * spacing, borderRadius: 10 * radius, backgroundColor: colors.surfaceSecondary },
      ]}
    >
      {items.map((item) => {
        const active = item.key === tab;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.segmentItem,
              {
                paddingVertical: 8 * spacing,
                borderRadius: 8 * radius,
                backgroundColor: active ? colors.surface : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.accentStrong : colors.textSecondary,
                fontSize: 14 * font,
                fontWeight: active ? '600' : '400',
                includeFontPadding: false,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** A 可切口径概览：分段 + 四指标 + 连续/最长/累计/上次学习 */
const OverviewCard: React.FC<{
  stats: StudyStatsOverview | null;
  range: StudyStatsRangeKey;
  loading: boolean;
  failed: boolean;
  breakDays: number | null;
  onRangeChange: (range: StudyStatsRangeKey) => void;
  onRetry: () => void;
  dayLabel: (dateStr: string) => string;
  formatDuration: (seconds: number) => string;
}> = ({ stats, range, loading, failed, breakDays, onRangeChange, onRetry, dayLabel, formatDuration }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const labels: Record<StudyStatsRangeKey, string> = {
    today: t.statsRangeToday,
    week: t.statsRangeWeek,
    month: t.statsRangeMonth,
    all: t.statsRangeAll,
  };
  const summary = stats?.rangeStats;
  const metrics = summary
    ? [
        { key: 'questions', label: t.statsMetricQuestions, value: String(summary.questionsAnswered) },
        { key: 'sessions', label: t.statsMetricSessions, value: String(summary.sessionsCompleted) },
        { key: 'accuracy', label: t.statsMetricAccuracy, value: `${summary.accuracy}%` },
        { key: 'duration', label: t.statsMetricDuration, value: formatDuration(summary.studyDuration) },
      ]
    : [];

  return (
    <View
      style={[
        styles.card,
        cardShadow(isDark),
        { backgroundColor: colors.surface, borderColor: colors.border, padding: 12 * spacing, borderRadius: 12 * radius },
      ]}
    >
      <ChipRow
        items={RANGES.map((key) => ({ key, label: labels[key] }))}
        active={range}
        onSelect={(key) => onRangeChange(key as StudyStatsRangeKey)}
      />

      {failed ? (
        <View style={styles.inlineState}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 * font, flex: 1 }}>
            {t.statsLoadFailed}
          </Text>
          <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8} style={styles.retry}>
            <Text style={{ color: colors.accentStrong, fontSize: 13 * font, fontWeight: '600' }}>
              {t.statsRetry}
            </Text>
          </Pressable>
        </View>
      ) : !summary ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.skeletonBlock,
                { backgroundColor: loading ? colors.borderLight : colors.border, borderRadius: 6 * radius },
              ]}
            />
          ))}
        </View>
      ) : (
        <>
          <View style={styles.metricRow}>
            {metrics.map((metric) => (
              <View key={metric.key} style={styles.metricCell}>
                <Text style={{ color: colors.text, fontSize: 19 * font, fontWeight: '600' }}>
                  {metric.value}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font, marginTop: 2 * spacing }}>
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>
          {!!stats && (
            <View style={styles.streakRow}>
              <Ionicons
                name={stats.streak > 0 ? 'flame' : 'flame-outline'}
                size={13 * font}
                color={stats.streak > 0 ? colors.accent : colors.textTertiary}
              />
              <Text
                style={{
                  color: stats.streak > 0 ? colors.accentStrong : colors.textTertiary,
                  fontSize: 12 * font,
                  fontWeight: '600',
                  marginLeft: 4 * spacing,
                }}
              >
                {stats.streak > 0 ? t.statsStreakDays(stats.streak) : t.statsStreakNone}
              </Text>
              <Text style={{ color: colors.border, fontSize: 12 * font, marginHorizontal: 6 * spacing }}>|</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 * font }}>
                {t.statsLongestStreak(stats.longestStreak ?? 0)}
              </Text>
              <Text style={{ color: colors.border, fontSize: 12 * font, marginHorizontal: 6 * spacing }}>|</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 * font }}>
                {t.statsTotalDays} {stats.totalDays}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12 * font, marginLeft: 'auto' }} numberOfLines={1}>
                {breakDays
                  ? t.statsBreakDays(breakDays)
                  : stats.lastActiveDate
                    ? t.statsLastPracticed(dayLabel(stats.lastActiveDate))
                    : t.statsLastActiveNone}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

/** B 近 14 天热力条：断签用虚线空框，今天用外描边，点选把时间轴定位到当天 */
const HeatStrip: React.FC<{
  series: DailySeriesPoint[];
  selectedDate: string | null;
  todayStr: string;
  onSelect: (date: string | null) => void;
  dayLabel: (dateStr: string) => string;
  formatDuration: (seconds: number) => string;
}> = ({ series, selectedDate, todayStr, onSelect, dayLabel, formatDuration }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const maxAnswered = series.reduce((max, point) => Math.max(max, point.questionsAnswered), 0);
  const selected = series.find((point) => point.date === selectedDate) ?? null;
  const heat = isDark ? HEAT_DARK : HEAT_LIGHT;

  return (
    <View
      style={[
        styles.card,
        cardShadow(isDark),
        { backgroundColor: colors.surface, borderColor: colors.border, padding: 12 * spacing, borderRadius: 12 * radius },
      ]}
    >
      <View style={styles.heatHeader}>
        <Text style={{ color: colors.textSecondary, fontSize: 12.5 * font, fontWeight: '600' }}>
          {t.statsHeatTitle}
        </Text>
        <View style={styles.legendRow}>
          <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>{t.statsHeatLess}</Text>
          {[1, 2, 3, 4].map((level) => (
            <View
              key={level}
              style={{
                width: 9 * font,
                height: 9 * font,
                borderRadius: 3 * radius,
                marginHorizontal: 3 * spacing,
                backgroundColor: heat[level],
              }}
            />
          ))}
          <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>{t.statsHeatMore}</Text>
        </View>
      </View>

      <View style={styles.heatGrid}>
        {series.map((point) => {
          const level = heatLevel(point.questionsAnswered, maxAnswered);
          const isSelected = point.date === selectedDate;
          const isToday = point.date === todayStr;
          return (
            <Pressable
              key={point.date}
              onPress={() => onSelect(isSelected ? null : point.date)}
              accessibilityRole="button"
              accessibilityLabel={t.statsHeatCellLabel(dayLabel(point.date), point.questionsAnswered)}
              style={[
                styles.heatCell,
                {
                  borderRadius: 5 * radius,
                  backgroundColor: level === 0 ? 'transparent' : heat[level],
                  borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                  borderColor: isSelected ? colors.accent : level === 0 ? colors.border : 'transparent',
                  borderStyle: level === 0 ? 'dashed' : 'solid',
                  ...(isToday && !isSelected
                    ? { outlineWidth: 1.5, outlineColor: colors.textTertiary, outlineOffset: 1 }
                    : null),
                },
              ]}
            />
          );
        })}
      </View>

      {!!selected && (
        <View style={styles.selectedDay}>
          <Text style={{ color: colors.text, fontSize: 13 * font, fontWeight: '600', marginRight: 8 * spacing }}>
            {dayLabel(selected.date)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 * font, flex: 1 }} numberOfLines={1}>
            {selected.questionsAnswered === 0
              ? t.statsHeatSelectedEmpty
              : `${t.statsMetricQuestions} ${selected.questionsAnswered} · ${t.statsSessionsUnit(
                  selected.sessionsCompleted,
                )} · ${formatDuration(selected.studyDuration)}`}
          </Text>
          <Pressable
            onPress={() => onSelect(null)}
            accessibilityRole="button"
            accessibilityLabel={t.statsHeatTitle}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={17 * font} color={colors.textTertiary} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

/** E 组内紧凑行：时间 · 来源 · 题数 · 正确率 · 用时（正确率只出现一次） */
const RecordRow: React.FC<{
  record: StudyRecord;
  onPress: (record: StudyRecord) => void;
  bankLabel: string;
  knowledgeLabel: string;
  clockLabel: (value: string | null) => string;
  formatDuration: (seconds: number) => string;
}> = ({ record, onPress, bankLabel, knowledgeLabel, clockLabel, formatDuration }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();

  const accuracy =
    record.totalQuestions > 0
      ? Math.round((record.correctCount / record.totalQuestions) * 100)
      : 0;
  const source =
    [record.textbookLabel, record.chapterName].filter(Boolean).join(' · ') ||
    (record.knowledgePointId ? knowledgeLabel : bankLabel);

  return (
    <Pressable
      onPress={() => onPress(record)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.recordRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={{ color: colors.textTertiary, fontSize: 12 * font, width: 40 * font }}>
        {clockLabel(record.finishedAt ?? record.startedAt)}
      </Text>
      <Text
        style={{ color: colors.text, fontSize: 13 * font, flex: 1, marginHorizontal: 8 * spacing }}
        numberOfLines={1}
      >
        {source}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 * font }}>
        {t.statsQuestionsUnit(record.totalQuestions)}
      </Text>
      <Text
        style={{
          color: toneOf(accuracy, true, colors),
          fontSize: 12 * font,
          fontWeight: '600',
          marginLeft: 8 * spacing,
          minWidth: 36 * font,
          textAlign: 'right',
        }}
      >
        {accuracy}%
      </Text>
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 12 * font,
          marginLeft: 8 * spacing,
          minWidth: 54 * font,
          textAlign: 'right',
        }}
      >
        {formatDuration(record.durationSeconds)}
      </Text>
      <Ionicons name="chevron-forward" size={13 * font} color={colors.textTertiary} style={{ marginLeft: 2 * spacing }} />
    </Pressable>
  );
};

/** E 组脚：当天答错数 → 错题本，给错题一个出口 */
const DayWrongFooter: React.FC<{ wrong: number; onPress: () => void }> = ({ wrong, onPress }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.wrongFooter, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name="alert-circle-outline" size={13 * font} color={colors.error} />
      <Text style={{ color: colors.error, fontSize: 12.5 * font, marginLeft: 4 * spacing, flex: 1 }}>
        {t.statsWrongOfDay(wrong)}
      </Text>
      <Text style={{ color: colors.accentStrong, fontSize: 12.5 * font, fontWeight: '600' }}>
        {t.statsGoWrongBook}
      </Text>
      <Ionicons name="chevron-forward" size={12 * font} color={colors.accentStrong} />
    </Pressable>
  );
};

/** F 章节进度：含未开始的章，点进去就是该章的单元列表 */
const ChapterList: React.FC<{
  chapters: ChapterStudyStat[];
  dayLabel: (dateStr: string) => string;
  onOpen: (chapter: ChapterStudyStat) => void;
}> = ({ chapters, dayLabel, onOpen }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  return (
    <>
      {chapters.map((chapter) => {
        const ratio =
          chapter.totalQuestions > 0
            ? Math.min(1, chapter.answeredQuestions / chapter.totalQuestions)
            : 0;
        const accuracy =
          chapter.answeredQuestions > 0
            ? Math.round((chapter.correctQuestions / chapter.answeredQuestions) * 100)
            : 0;
        const started = chapter.answeredQuestions > 0;
        const lastDay = chapter.lastPracticedAt ? formatDate(chapter.lastPracticedAt) : '';
        return (
          <Pressable
            key={chapter.id}
            onPress={() => onOpen(chapter)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.card,
              cardShadow(isDark),
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: 12 * spacing,
                borderRadius: 12 * radius,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text
                style={{
                  color: started ? colors.text : colors.textTertiary,
                  fontSize: 15 * font,
                  fontWeight: '600',
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {chapter.name}
              </Text>
              <Text
                style={{
                  color: toneOf(accuracy, started, colors),
                  fontSize: 12.5 * font,
                  fontWeight: '600',
                }}
              >
                {started ? `${accuracy}%` : t.statusNotStarted}
              </Text>
              <Ionicons name="chevron-forward" size={14 * font} color={colors.textTertiary} />
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: colors.borderLight, borderRadius: 2 * radius, marginVertical: 9 * spacing },
              ]}
            >
              <View
                style={{
                  width: `${ratio * 100}%`,
                  height: 4,
                  borderRadius: 2 * radius,
                  backgroundColor: started ? colors.accent : 'transparent',
                }}
              />
            </View>
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
                {t.statsProgress(chapter.answeredQuestions, chapter.totalQuestions)}
              </Text>
              {!!lastDay && (
                <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
                  {t.statsLastPracticed(dayLabel(lastDay))}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </>
  );
};

/** G 知识点树工具条：上色图例 + 全部展开 / 全部收起 */
const KpToolbar: React.FC<{ allCollapsed: boolean; onCollapseAll: (next: boolean) => void }> = ({
  allCollapsed,
  onCollapseAll,
}) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();

  const legends = [
    { key: 'strong', label: t.statsLegendStrong, color: colors.success },
    { key: 'fair', label: t.statsLegendFair, color: colors.warning },
    { key: 'weak', label: t.statsLegendWeak, color: colors.error },
    { key: 'none', label: t.statsLegendNone, color: colors.textTertiary },
  ];

  return (
    <View style={styles.kpToolbar}>
      <View style={styles.legendRow}>
        {legends.map((legend) => (
          <View key={legend.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: legend.color }]} />
            <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>{legend.label}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => onCollapseAll(!allCollapsed)} accessibilityRole="button" hitSlop={6}>
        <Text style={{ color: colors.accentStrong, fontSize: 12.5 * font, fontWeight: '600' }}>
          {allCollapsed ? t.statsExpandAll : t.statsCollapseAll}
        </Text>
      </Pressable>
    </View>
  );
};

/** G 知识点树行：折叠靠 twisty，正文按下钻（未选科目时不可下钻） */
const KpRows: React.FC<{
  rows: { node: KnowledgePointStudyStat; depth: number; isCollapsed: boolean }[];
  canDrill: boolean;
  onToggle: (id: string, next: boolean) => void;
  onOpen: (node: KnowledgePointStudyStat) => void;
}> = ({ rows, canDrill, onToggle, onOpen }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();

  return (
    <View
      style={[
        styles.card,
        cardShadow(isDark),
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12 * radius,
          overflow: 'hidden',
        },
      ]}
    >
      {rows.map(({ node, depth, isCollapsed }, index) => {
        const started = node.answeredQuestions > 0;
        const accuracy = started
          ? Math.round((node.correctQuestions / node.answeredQuestions) * 100)
          : 0;
        const indent = (12 + depth * 14) * spacing;
        return (
          <View key={node.id}>
            {index > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.border,
                  marginLeft: indent,
                }}
              />
            )}
            <View style={[styles.kpRow, { paddingLeft: indent, paddingRight: 12 * spacing }]}>
              {node.children && node.children.length > 0 ? (
                <Pressable
                  onPress={() => onToggle(node.id, !isCollapsed)}
                  accessibilityRole="button"
                  accessibilityLabel={node.name}
                  hitSlop={8}
                  style={styles.kpTwisty}
                >
                  <Ionicons
                    name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                    size={14 * font}
                    color={colors.textTertiary}
                  />
                </Pressable>
              ) : (
                <View style={styles.kpTwisty} />
              )}
              <Pressable onPress={() => canDrill && onOpen(node)} accessibilityRole="button" style={styles.kpLabel}>
                <Text
                  style={{
                    flex: 1,
                    color: depth === 0 ? colors.text : colors.textSecondary,
                    fontSize: (depth === 0 ? 14 : 13) * font,
                    fontWeight: depth === 0 ? '600' : '400',
                  }}
                  numberOfLines={1}
                >
                  {node.name}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font, marginLeft: 6 * spacing }}>
                  {node.answeredQuestions}/{node.totalQuestions}
                </Text>
                <Text
                  style={{
                    color: toneOf(accuracy, started, colors),
                    fontSize: 12 * font,
                    fontWeight: '600',
                    marginLeft: 8 * spacing,
                    minWidth: 36 * font,
                    textAlign: 'right',
                  }}
                >
                  {started ? `${accuracy}%` : '—'}
                </Text>
                {canDrill && (
                  <Ionicons
                    name="chevron-forward"
                    size={13 * font}
                    color={colors.textTertiary}
                    style={{ marginLeft: 6 * spacing }}
                  />
                )}
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const RecordsScreen: React.FC<RecordsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId, subjectId, publisherId, textbookId } = useSelector(
    (state: RootState) => state.settings,
  );

  const [range, setRange] = useState<StudyStatsRangeKey>('all');
  const [tab, setTab] = useState<TabKey>('time');
  const [scope, setScope] = useState<ScopeKey>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [stats, setStats] = useState<StudyStatsOverview | null>(null);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [chapterStats, setChapterStats] = useState<ChapterStudyStat[]>([]);
  const [kpStats, setKpStats] = useState<KnowledgePointStudyStat[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statsFailed, setStatsFailed] = useState(false);
  const [recordsFailed, setRecordsFailed] = useState(false);
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

  const fetchStats = useCallback(async () => {
    try {
      setStats(await api.getStats(range));
      setStatsFailed(false);
    } catch {
      setStatsFailed(true);
    }
  }, [range]);

  const fetchRecords = useCallback(
    async (pageNum: number) => {
      try {
        const response = await api.getStudyRecords({
          page: pageNum,
          pageSize: PAGE_SIZE,
          gradeId: gradeId ?? undefined,
          subjectId: subjectId ?? undefined,
          scopeType: scope === 'all' ? undefined : scope,
          date: selectedDate ?? undefined,
        });
        setRecords((prev) => (pageNum === 1 ? response.data : [...prev, ...response.data]));
        setTotalPages(response.totalPages);
        setPage(pageNum);
        setRecordsFailed(false);
      } catch {
        setRecordsFailed(true);
      }
    },
    [gradeId, subjectId, scope, selectedDate],
  );

  const fetchChapterStats = useCallback(async () => {
    if (!textbookId) {
      setChapterStats([]);
      return;
    }
    setChapterStats(await api.getChapterStats(textbookId));
  }, [textbookId]);

  const fetchKnowledgeStats = useCallback(async () => {
    setKpStats(
      await api.getKnowledgePointStats({
        stageId: selectedGrade?.stageId ?? null,
        subjectId: subjectId ?? null,
      }),
    );
  }, [selectedGrade, subjectId]);

  // 年级 / 科目字典只拉一次，避免与数据加载 effect 形成相互触发
  useEffect(() => {
    (async () => {
      const [subs, gradeList] = await Promise.all([api.getSubjects(), api.getGrades()]);
      setSubjects(subs);
      setGrades(gradeList);
    })();
  }, []);

  // 首屏 / 口径或筛选变化：概览 + 时间线
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await Promise.all([fetchStats(), fetchRecords(1)]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchStats, fetchRecords]);

  useEffect(() => {
    if (tab === 'chapter') fetchChapterStats();
    if (tab === 'knowledge') fetchKnowledgeStats();
  }, [tab, fetchChapterStats, fetchKnowledgeStats]);

  // 全局「年级 + 科目」选择器居中显示在原生 header
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchRecords(1),
      tab === 'chapter' ? fetchChapterStats() : null,
      tab === 'knowledge' ? fetchKnowledgeStats() : null,
    ]);
    setRefreshing(false);
  }, [fetchStats, fetchRecords, fetchChapterStats, fetchKnowledgeStats, tab]);

  const onLoadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchRecords(page + 1).finally(() => setLoadingMore(false));
  };

  const todayStr = formatDate(new Date());

  const dayLabel = useCallback(
    (dateStr: string): string => {
      if (!dateStr) return '';
      if (dateStr === todayStr) return t.statsDayToday;
      if (dateStr === formatDate(new Date(Date.now() - 86_400_000))) return t.statsDayYesterday;
      const [, month, day] = dateStr.split('-');
      return t.monthDay(Number(month), Number(day));
    },
    [t, todayStr],
  );

  const clockLabel = useCallback(
    (value: string | null): string => {
      const parts = getDisplayParts(value);
      return parts ? t.clockTime(parts.hour, parts.minute) : '';
    },
    [t],
  );

  const durationLabel = useCallback(
    (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins > 0) return `${mins}${t.minuteShort}${secs}${t.secondShort}`;
      return `${secs}${t.secondShort}`;
    },
    [t],
  );

  const openRecord = (record: StudyRecord) => {
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

  /** 「上次学习」落在昨天之后才算断签：与后端 streak 口径一致 */
  const breakDays = useMemo(() => {
    if (!stats?.lastActiveDate) return null;
    const gap = dayNumber(todayStr) - dayNumber(stats.lastActiveDate);
    return gap > 1 ? gap : null;
  }, [stats, todayStr]);

  /** E 按天分组：组头数字来自本页已加载的记录，保证与下面的行对得上 */
  const sections = useMemo(() => {
    const groups = new Map<string, StudyRecord[]>();
    for (const record of records) {
      const key = formatDate(record.finishedAt ?? record.startedAt);
      if (!key) continue;
      const list = groups.get(key);
      if (list) list.push(record);
      else groups.set(key, [record]);
    }
    return [...groups.entries()].map(([date, data]) => ({
      key: date,
      date,
      data,
      answered: data.reduce((sum, item) => sum + item.totalQuestions, 0),
      wrong: data.reduce((sum, item) => sum + item.wrongCount, 0),
      duration: data.reduce((sum, item) => sum + item.durationSeconds, 0),
    }));
  }, [records]);

  /** G 折叠树：rows 只含可见节点，parentIds 供一键收起 / 展开全部 */
  const kpTree = useMemo(() => {
    const rows: { node: KnowledgePointStudyStat; depth: number; isCollapsed: boolean }[] = [];
    const parentIds: string[] = [];
    const collectParents = (list: KnowledgePointStudyStat[]) => {
      for (const node of list) {
        if (node.children && node.children.length > 0) {
          parentIds.push(node.id);
          collectParents(node.children);
        }
      }
    };
    collectParents(kpStats);
    const walk = (list: KnowledgePointStudyStat[], depth: number) => {
      for (const node of list) {
        const isCollapsed = !!collapsed[node.id];
        rows.push({ node, depth, isCollapsed });
        if (!isCollapsed) walk(node.children ?? [], depth + 1);
      }
    };
    walk(kpStats, 0);
    return {
      rows,
      allCollapsed: parentIds.length > 0 && parentIds.every((id) => collapsed[id]),
      collapseAll: (next: boolean) =>
        setCollapsed(next ? Object.fromEntries(parentIds.map((id) => [id, true])) : {}),
    };
  }, [kpStats, collapsed]);

  const tabItems: { key: TabKey; label: string }[] = [
    { key: 'time', label: t.statsTabTime },
    { key: 'chapter', label: t.statsTabChapter },
    { key: 'knowledge', label: t.statsTabKnowledge },
  ];

  const scopeLabel: Record<ScopeKey, string> = {
    all: t.statsScopeAll,
    chapter: t.statsScopeChapter,
    knowledge: t.statsScopeKnowledge,
    bank: t.statsScopeBank,
  };

  const listHeader = (
    <>
      <OverviewCard
        stats={stats}
        range={range}
        loading={loading}
        failed={statsFailed}
        breakDays={breakDays}
        onRangeChange={setRange}
        onRetry={fetchStats}
        dayLabel={dayLabel}
        formatDuration={durationLabel}
      />
      <HeatStrip
        series={stats?.dailySeries ?? []}
        selectedDate={selectedDate}
        todayStr={todayStr}
        onSelect={setSelectedDate}
        dayLabel={dayLabel}
        formatDuration={durationLabel}
      />
      <SegmentedTabs tab={tab} items={tabItems} onChange={setTab} />
      {tab === 'time' && (
        <ChipRow
          items={SCOPES.map((key) => ({ key, label: scopeLabel[key] }))}
          active={scope}
          onSelect={(key) => setScope(key as ScopeKey)}
          pill
        />
      )}
    </>
  );

  // ── F 章节视角 ──────────────────────────────────────────────────────
  const chapterBody = !textbookId ? (
    <StateCard
      icon="library-outline"
      title={t.statsNeedTextbookTitle}
      sub={t.statsNeedTextbookSub}
      actionLabel={t.statsGoTextbook}
      onAction={() => navigation.navigate('Textbook')}
    />
  ) : chapterStats.length === 0 ? (
    <StateCard icon="bar-chart-outline" title={t.statsNoChapterData} />
  ) : (
    <ChapterList
      chapters={chapterStats}
      dayLabel={dayLabel}
      onOpen={(chapter) =>
        navigation.navigate('TextbookUnits', {
          chapterId: chapter.id,
          chapterName: chapter.name,
        })
      }
    />
  );

  const knowledgeBody = kpStats.length === 0 ? (
    <StateCard icon="bar-chart-outline" title={t.statsNoKnowledgeData} />
  ) : (
    <>
      <KpToolbar allCollapsed={kpTree.allCollapsed} onCollapseAll={kpTree.collapseAll} />
      <KpRows
        rows={kpTree.rows}
        canDrill={!!subjectId}
        onToggle={(id, next) => setCollapsed((prev) => ({ ...prev, [id]: next }))}
        onOpen={(node) =>
          navigation.navigate('KnowledgeUnits', {
            knowledgePointId: node.id,
            knowledgePointName: node.name,
            subjectId: subjectId ?? '',
            subjectName: selectedSubject?.name ?? '',
            gradeId: selectedGrade?.id ?? null,
            publisherId,
          })
        }
      />
    </>
  );

  // ── E 按天分组时间轴 ────────────────────────────────────────────────
  const timeList = (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        recordsFailed && records.length === 0 ? (
          <StateCard
            icon="cloud-offline-outline"
            title={t.statsLoadFailed}
            sub={t.statsLoadFailedSub}
            actionLabel={t.statsRetry}
            onAction={() => fetchRecords(1)}
          />
        ) : loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (stats?.totalDays ?? 0) === 0 ? (
          <StateCard icon="book-outline" title={t.statsFirstUseTitle} sub={t.statsFirstUseSub} />
        ) : (
          <StateCard icon="bar-chart-outline" title={t.recordsEmpty} sub={t.recordsEmptySub} />
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.dayGroup}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '600' }}>
              {dayLabel(section.date)}
            </Text>
            <Text
              style={{ color: colors.textTertiary, fontSize: 12 * font, marginLeft: 8 * spacing }}
              numberOfLines={1}
            >
              {`${t.statsMetricQuestions} ${section.answered} · ${t.statsSessionsUnit(
                section.data.length,
              )} · ${durationLabel(section.duration)}`}
            </Text>
          </View>
          <View
            style={[
              styles.card,
              cardShadow(isDark),
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 12 * radius,
                overflow: 'hidden',
              },
            ]}
          >
            {section.data.map((record, index) => (
              <View key={record.id}>
                {index > 0 && (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
                )}
                <RecordRow
                  record={record}
                  onPress={openRecord}
                  bankLabel={scopeLabel.bank}
                  knowledgeLabel={scopeLabel.knowledge}
                  clockLabel={clockLabel}
                  formatDuration={durationLabel}
                />
              </View>
            ))}
            {section.wrong > 0 && (
              <>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
                <DayWrongFooter
                  wrong={section.wrong}
                  onPress={() => navigation.navigate('WrongQuestions')}
                />
              </>
            )}
          </View>
        </View>
      )}
    />
  );

  const detailBody = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {listHeader}
      {tab === 'chapter' ? chapterBody : knowledgeBody}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {tab === 'time' ? timeList : detailBody}
    </View>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 9,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  segment: {
    flexDirection: 'row',
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
  },
  inlineState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  retry: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  skeletonBlock: {
    width: 44,
    height: 26,
  },
  metricRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  heatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  heatCell: {
    // 7 列 × 2 行：等分宽度适配不同屏宽
    width: '12.857%',
    aspectRatio: 1,
  },
  selectedDay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  stateCard: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  ctaButton: {
    alignSelf: 'center',
  },
  spinner: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  dayGroup: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 4,
    overflow: 'hidden',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  wrongFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  kpToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  kpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  kpTwisty: {
    width: 20,
    alignItems: 'center',
    marginRight: 2,
  },
  kpLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default RecordsScreen;
