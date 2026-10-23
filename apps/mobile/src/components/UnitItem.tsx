import type { UnitInfo } from '@sharp/shared';
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';

interface UnitItemProps {
  unit: UnitInfo;
  /** 传入 unit 本身，父组件可以保持稳定回调引用，列表项才能被 memo 命中 */
  onPress: (unit: UnitInfo) => void;
  loading?: boolean;
  disabled?: boolean;
}

const statusConfig: Record<string, { labelKey: 'statusNotStarted' | 'statusInProgress' | 'statusCompleted'; color: string; bg: string }> = {
  not_started: { labelKey: 'statusNotStarted', color: '#6B7280', bg: '#F3F4F6' },
  in_progress: { labelKey: 'statusInProgress', color: '#D97706', bg: '#FEF3C7' },
  completed: { labelKey: 'statusCompleted', color: '#059669', bg: '#D1FAE5' },
};

const UnitItem: React.FC<UnitItemProps> = ({ unit, onPress, loading = false, disabled = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { spacing, font, radius } = useDensity();
  const status = statusConfig[unit.status] ?? statusConfig.not_started;
  const progress =
    unit.totalQuestions > 0
      ? Math.round((unit.answeredCount / unit.totalQuestions) * 100)
      : 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: loading ? colors.primary : 'transparent',
          opacity: disabled && !loading ? 0.5 : 1,
          padding: 16 * spacing,
          marginBottom: 10 * spacing,
          borderRadius: 12 * radius,
        },
      ]}
      onPress={() => onPress(unit)}
      disabled={disabled}
      activeOpacity={loading ? 1 : 0.7}
    >
      <View style={[styles.header, { marginBottom: 8 * spacing }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: 16 * font }]}>{t.unitNumber(unit.unitIndex + 1)}</Text>
        <View style={styles.headerRight}>
          {loading && (
            <ActivityIndicator size="small" color={colors.primary} style={[styles.spinner, { marginRight: 8 * spacing }]} />
          )}
          <View style={[styles.badge, { backgroundColor: status.bg, paddingHorizontal: 10 * spacing, paddingVertical: 4 * spacing, borderRadius: 12 * radius }]}>
            <Text style={[styles.badgeText, { color: status.color, fontSize: 12 * font }]}>{t[status.labelKey]}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.info, { marginBottom: 10 * spacing }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: 13 * font }]}>
          {t.unitQuestionRange(unit.startIndex + 1, unit.endIndex + 1, unit.totalQuestions)}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border, marginRight: 10 * spacing, borderRadius: 3 * radius, height: 6 * spacing }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary, borderRadius: 3 * radius }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary, fontSize: 12 * font }]}>{progress}%</Text>
      </View>
      {unit.status === 'completed' && (
        <Text style={[styles.score, { color: colors.accent, fontSize: 13 * font, marginTop: 8 * spacing }]}>
          {t.unitAccuracy}: {unit.totalQuestions > 0 ? Math.round((unit.correctCount / unit.totalQuestions) * 100) : 0}%
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  info: {
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    minWidth: 36,
    textAlign: 'right',
  },
  score: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default memo(UnitItem);
