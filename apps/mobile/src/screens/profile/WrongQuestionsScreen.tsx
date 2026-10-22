import type { Question } from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../services/api';

const WrongQuestionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
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
        style={[styles.questionCard, { backgroundColor: colors.surface, borderRadius: 12 * radius, marginBottom: 10 * spacing }]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.questionHeader, { padding: 14 * spacing }]}>
          <View style={[styles.questionIndex, { backgroundColor: colors.errorLight, width: 28 * spacing, height: 28 * spacing, borderRadius: 14 * spacing, marginRight: 10 * spacing }]}>
            <Text style={[styles.questionIndexText, { color: colors.error, fontSize: 12 * font }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.questionContent, { color: colors.textSecondary, fontSize: 14 * font, lineHeight: 20 * font }]} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={[styles.expandIcon, { color: colors.textTertiary, fontSize: 12 * font, marginLeft: 8 * spacing }]}>{isExpanded ? '▲' : '▼'}</Text>
        </View>

        {isExpanded && (
          <View style={[styles.questionDetail, { borderTopColor: colors.borderLight, paddingHorizontal: 14 * spacing, paddingBottom: 14 * spacing, paddingTop: 12 * spacing }]}>
            {[...item.options]
              .sort((a, b) => a.sortNo - b.sortNo)
              .map((option) => (
                <View
                  key={option.id}
                  style={[
                    styles.optionRow,
                    { paddingVertical: 8 * spacing, paddingHorizontal: 10 * spacing, borderRadius: 8 * radius, marginBottom: 4 * spacing },
                    option.isCorrect && { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionKey,
                      { color: colors.textSecondary, width: 24 * spacing, height: 24 * spacing, borderRadius: 12 * spacing, lineHeight: 22 * spacing, fontSize: 12 * font, marginRight: 10 * spacing },
                      option.isCorrect && { borderColor: colors.accent, color: colors.accent },
                    ]}
                  >
                    {option.optionKey}
                  </Text>
                  <Text
                    style={[
                      styles.optionContent,
                      { color: colors.textSecondary, fontSize: 14 * font },
                      option.isCorrect && styles.correctOptionContent,
                    ]}
                  >
                    {option.content}
                  </Text>
                  {option.isCorrect && (
                    <Text style={[styles.correctMark, { color: colors.accent, fontSize: 14 * font, marginLeft: 8 * spacing }]}>✓</Text>
                  )}
                </View>
              ))}

            {item.analysis && (
              <View style={[styles.analysisBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary, marginTop: 10 * spacing, padding: 12 * spacing, borderRadius: 8 * radius }]}>
                <Text style={[styles.analysisLabel, { color: colors.primary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.analysis}</Text>
                <Text style={[styles.analysisText, { color: colors.textSecondary, fontSize: 13 * font, lineHeight: 20 * font }]}>{item.analysis}</Text>
              </View>
            )}

            <View style={[styles.difficultyRow, { marginTop: 10 * spacing }]}>
              <Text style={[styles.difficultyLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>{t.difficultyLabel}</Text>
              {Array.from({ length: 5 }, (_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.difficultyStar,
                    { fontSize: 14 * font, marginRight: 2 * spacing, color: i < item.difficulty ? '#F59E0B' : colors.border },
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
        contentContainerStyle={[styles.list, { padding: 16 * spacing, paddingBottom: 24 * spacing }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
            <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>🎉</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font, marginBottom: 4 * spacing }]}>{t.wrongEmpty}</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 14 * font }]}>{t.wrongEmptySub}</Text>
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
