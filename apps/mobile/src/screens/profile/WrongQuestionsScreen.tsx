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

const WrongQuestionsScreen: React.FC = () => {
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
        style={styles.questionCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.questionHeader}>
          <View style={styles.questionIndex}>
            <Text style={styles.questionIndexText}>{index + 1}</Text>
          </View>
          <Text style={styles.questionContent} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
        </View>

        {isExpanded && (
          <View style={styles.questionDetail}>
            {item.options
              .sort((a, b) => a.sortNo - b.sortNo)
              .map((option) => (
                <View
                  key={option.id}
                  style={[
                    styles.optionRow,
                    option.isCorrect && styles.correctOptionRow,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionKey,
                      option.isCorrect && styles.correctOptionKey,
                    ]}
                  >
                    {option.optionKey}
                  </Text>
                  <Text
                    style={[
                      styles.optionContent,
                      option.isCorrect && styles.correctOptionContent,
                    ]}
                  >
                    {option.content}
                  </Text>
                  {option.isCorrect && (
                    <Text style={styles.correctMark}>✓</Text>
                  )}
                </View>
              ))}

            {item.analysis && (
              <View style={styles.analysisBox}>
                <Text style={styles.analysisLabel}>解析</Text>
                <Text style={styles.analysisText}>{item.analysis}</Text>
              </View>
            )}

            <View style={styles.difficultyRow}>
              <Text style={styles.difficultyLabel}>难度：</Text>
              {Array.from({ length: 5 }, (_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.difficultyStar,
                    { color: i < item.difficulty ? '#F59E0B' : '#E5E7EB' },
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>错题本</Text>
            <Text style={styles.subtitle}>共 {questions.length} 道错题</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>暂无错题</Text>
            <Text style={styles.emptySub}>继续保持，错题会显示在这里</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  questionContent: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  expandIcon: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  questionDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  correctOptionRow: {
    backgroundColor: '#D1FAE5',
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
    color: '#6B7280',
    marginRight: 10,
    overflow: 'hidden',
  },
  correctOptionKey: {
    borderColor: '#059669',
    color: '#059669',
  },
  optionContent: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  correctOptionContent: {
    color: '#065F46',
    fontWeight: '500',
  },
  correctMark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 8,
  },
  analysisBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  analysisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  difficultyLabel: {
    fontSize: 12,
    color: '#6B7280',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default WrongQuestionsScreen;
