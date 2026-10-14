import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { UnitInfo } from '@sharp/shared';

interface UnitItemProps {
  unit: UnitInfo;
  onPress: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: '未开始', color: '#6B7280', bg: '#F3F4F6' },
  in_progress: { label: '进行中', color: '#D97706', bg: '#FEF3C7' },
  completed: { label: '已完成', color: '#059669', bg: '#D1FAE5' },
};

const UnitItem: React.FC<UnitItemProps> = ({ unit, onPress }) => {
  const status = statusConfig[unit.status] ?? statusConfig.not_started;
  const progress =
    unit.totalQuestions > 0
      ? Math.round((unit.answeredCount / unit.totalQuestions) * 100)
      : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>第 {unit.unitIndex + 1} 单元</Text>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.infoText}>
          {unit.startIndex + 1} - {unit.endIndex + 1} 题 · 共 {unit.totalQuestions} 题
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
      </View>
      {unit.status === 'completed' && (
        <Text style={styles.score}>
          正确率: {unit.totalQuestions > 0 ? Math.round((unit.correctCount / unit.totalQuestions) * 100) : 0}%
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    minWidth: 36,
    textAlign: 'right',
  },
  score: {
    fontSize: 13,
    color: '#059669',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default UnitItem;
