import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../hooks/useTheme';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { fetchQuestions, resetStudy } from '../../stores/studySlice';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'QuizResult'>;
type QuizResultRouteProp = RouteProp<HomeStackParamList, 'QuizResult'>;

interface QuizResultScreenProps {
  navigation: NavigationProp;
  route: QuizResultRouteProp;
}

const QuizResultScreen: React.FC<QuizResultScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { categoryId, unitIndex, categoryName } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { result, currentQuestions } = useSelector((state: RootState) => state.study);

  const [expandedWrong, setExpandedWrong] = useState<Record<string, boolean>>({});

  if (!result) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.noResultText, { color: colors.textSecondary }]}>暂无结果数据</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const percentage =
    result.totalQuestions > 0
      ? Math.round((result.correctCount / result.totalQuestions) * 100)
      : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const getScoreColor = (): string => {
    if (percentage >= 80) return '#059669';
    if (percentage >= 60) return '#D97706';
    return colors.error;
  };

  const getScoreEmoji = (): string => {
    if (percentage >= 90) return '🎉';
    if (percentage >= 80) return '👍';
    if (percentage >= 60) return '💪';
    return '📚';
  };

  const handleRetry = async () => {
    dispatch(resetStudy());
    try {
      await api.startStudy(categoryId, unitIndex);
    } catch {
      // silently proceed even if start fails
    }
    const fetchResult = await dispatch(
      fetchQuestions({ categoryId, unitIndex })
    );
    if (fetchQuestions.fulfilled.match(fetchResult)) {
      navigation.replace('Quiz', {
        categoryId,
        unitIndex,
        categoryName,
      });
    }
  };

  const handleContinue = () => {
    dispatch(resetStudy());
    navigation.popTo('UnitList', { category: { id: categoryId, name: categoryName } as any });
  };

  const toggleWrong = (questionId: string) => {
    setExpandedWrong((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Score card */}
      <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.scoreEmoji}>{getScoreEmoji()}</Text>
        <Text style={[styles.percentage, { color: getScoreColor() }]}>
          {percentage}%
        </Text>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>正确率</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{result.correctCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>正确</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {result.wrongCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>错误</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{result.totalQuestions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>总题数</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatTime(result.durationSeconds)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>用时</Text>
          </View>
        </View>
      </View>

      {/* Wrong questions */}
      {result.wrongAnswers.length > 0 && (
        <View style={styles.wrongSection}>
          <Text style={[styles.wrongTitle, { color: colors.text }]}>
            错题回顾 ({result.wrongAnswers.length}题)
          </Text>
          {result.wrongAnswers.map((wa, idx) => {
            const isExpanded = expandedWrong[wa.question.id];
            return (
              <TouchableOpacity
                key={wa.question.id}
                style={[styles.wrongItem, { backgroundColor: colors.surface }]}
                onPress={() => toggleWrong(wa.question.id)}
                activeOpacity={0.7}
              >
                <View style={styles.wrongHeader}>
                  <View style={[styles.wrongIndex, { backgroundColor: colors.errorLight, color: colors.error }]}>
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 28 }}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.wrongContent, { color: colors.text }]} numberOfLines={1}>
                    {wa.question.content}
                  </Text>
                  <Text style={[styles.expandIcon, { color: colors.textTertiary }]}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded && (
                  <View style={[styles.wrongDetail, { borderTopColor: colors.borderLight }]}>
                    <View style={styles.wrongRow}>
                      <Text style={[styles.wrongLabel, { color: colors.textSecondary }]}>你的答案：</Text>
                      <Text style={[styles.wrongAnswer, { color: colors.error }]}>{wa.selectedKeys.join(', ')}</Text>
                    </View>
                    <View style={styles.wrongRow}>
                      <Text style={[styles.wrongLabel, { color: colors.textSecondary }]}>正确答案：</Text>
                      <Text style={styles.correctAnswer}>{wa.correctKeys.join(', ')}</Text>
                    </View>
                    {wa.question.analysis && (
                      <View style={[styles.analysisBox, { backgroundColor: colors.background }]}>
                        <Text style={[styles.analysisText, { color: colors.text }]}>{wa.question.analysis}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={[styles.retryText, { color: colors.primary }]}>再练一次</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.primary }]} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.continueText}>继续学习</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scoreCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  scoreEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  percentage: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 15,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  wrongSection: {
    marginBottom: 20,
  },
  wrongTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  wrongItem: {
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  wrongHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  wrongIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
    marginRight: 10,
  },
  wrongContent: {
    flex: 1,
    fontSize: 14,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  wrongDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  wrongRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  wrongLabel: {
    fontSize: 13,
    width: 75,
  },
  wrongAnswer: {
    fontSize: 13,
    fontWeight: '500',
  },
  correctAnswer: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  analysisBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuizResultScreen;
