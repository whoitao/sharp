import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import type { Question } from '@sharp/shared';
import { useTheme } from '../../hooks/useTheme';

const WrongQuestionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const fetchWrongQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getWrongQuestions();
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWrongQuestions();
  }, [fetchWrongQuestions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWrongQuestions();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = ({ item, index }: { item: Question; index: number }) => {
    const isExpanded = expandedIds[item.id];
    const correctOption = item.options.find((o) => o.isCorrect);

    return (
      <TouchableOpacity
        style={[styles.questionCard, { backgroundColor: colors.surface }]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.questionHeader}>
          <View style={[styles.questionIndex, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.questionIndexText, { color: colors.error }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.questionContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={[styles.expandIcon, { color: colors.textTertiary }]}>{isExpanded ? '▲' : '▼'}</Text>
        </View>

        {isExpanded && (
          <View style={[styles.questionDetail, { borderTopColor: colors.borderLight }]}>
            {item.options
              .sort((a, b) => a.sortNo - b.sortNo)
              .map((option) => (
                <View
                  key={option.id}
                  style={[
                    styles.optionRow,
                    option.isCorrect && { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionKey,
                      { color: colors.textSecondary },
                      option.isCorrect && { borderColor: colors.accent, color: colors.accent },
                    ]}
                  >
                    {option.optionKey}
                  </Text>
                  <Text
                    style={[
                      styles.optionContent,
                      { color: colors.textSecondary },
                      option.isCorrect && styles.correctOptionContent,
                    ]}
                  >
                    {option.content}
                  </Text>
                  {option.isCorrect && (
                    <Text style={[styles.correctMark, { color: colors.accent }]}>✓</Text>
                  )}
                </View>
              ))}

            {item.analysis && (
              <View style={[styles.analysisBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
                <Text style={[styles.analysisLabel, { color: colors.primary }]}>解析</Text>
                <Text style={[styles.analysisText, { color: colors.textSecondary }]}>{item.analysis}</Text>
              </View>
            )}

            <View style={styles.difficultyRow}>
              <Text style={[styles.difficultyLabel, { color: colors.textSecondary }]}>难度：</Text>
              {Array.from({ length: 5 }, (_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.difficultyStar,
                    { color: i < item.difficulty ? '#F59E0B' : colors.border },
                  ]}
                >
                  ★
                </Text>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && questions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>错题本</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>共 {questions.length} 道错题</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无错题</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>继续保持，错题会显示在这里</Text>
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
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
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
  questionDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    paddingTop: 12,
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
  optionContent: {
    flex: 1,
    fontSize: 14,
  },
  correctOptionContent: {
    color: '#065F46',
    fontWeight: '500',
  },
  correctMark: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
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
    marginTop: 10,
  },
  difficultyLabel: {
    fontSize: 12,
  },
  difficultyStar: {
    fontSize: 14,
    marginRight: 2,
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
});

export default WrongQuestionsScreen;
