import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootState, AppDispatch } from '../../stores';
import { resetStudy } from '../../stores/studySlice';
import { fetchQuestions } from '../../stores/studySlice';
import type { HomeStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'QuizResult'>;
type QuizResultRouteProp = RouteProp<HomeStackParamList, 'QuizResult'>;

interface QuizResultScreenProps {
  navigation: NavigationProp;
  route: QuizResultRouteProp;
}

const QuizResultScreen: React.FC<QuizResultScreenProps> = ({ navigation, route }) => {
  const { categoryId, unitIndex, categoryName } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { result, currentQuestions } = useSelector((state: RootState) => state.study);

  const [expandedWrong, setExpandedWrong] = useState<Record<string, boolean>>({});

  if (!result) {
    return (
      <View style={styles.center}>
        <Text style={styles.noResultText}>暂无结果数据</Text>
        <TouchableOpacity
          style={styles.backButton}
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
    return '#DC2626';
  };

  const getScoreEmoji = (): string => {
    if (percentage >= 90) return '🎉';
    if (percentage >= 80) return '👍';
    if (percentage >= 60) return '💪';
    return '📚';
  };

  const handleRetry = async () => {
    dispatch(resetStudy());
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreEmoji}>{getScoreEmoji()}</Text>
        <Text style={[styles.percentage, { color: getScoreColor() }]}>
          {percentage}%
        </Text>
        <Text style={styles.scoreLabel}>正确率</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{result.correctCount}</Text>
            <Text style={styles.statLabel}>正确</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>
              {result.wrongCount}
            </Text>
            <Text style={styles.statLabel}>错误</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{result.totalQuestions}</Text>
            <Text style={styles.statLabel}>总题数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(result.durationSeconds)}</Text>
            <Text style={styles.statLabel}>用时</Text>
          </View>
        </View>
      </View>

      {/* Wrong questions */}
      {result.wrongAnswers.length > 0 && (
        <View style={styles.wrongSection}>
          <Text style={styles.wrongTitle}>
            错题回顾 ({result.wrongAnswers.length}题)
          </Text>
          {result.wrongAnswers.map((wa, idx) => {
            const isExpanded = expandedWrong[wa.question.id];
            return (
              <TouchableOpacity
                key={wa.question.id}
                style={styles.wrongItem}
                onPress={() => toggleWrong(wa.question.id)}
                activeOpacity={0.7}
              >
                <View style={styles.wrongHeader}>
                  <Text style={styles.wrongIndex}>{idx + 1}</Text>
                  <Text style={styles.wrongContent} numberOfLines={1}>
                    {wa.question.content}
                  </Text>
                  <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded && (
                  <View style={styles.wrongDetail}>
                    <View style={styles.wrongRow}>
                      <Text style={styles.wrongLabel}>你的答案：</Text>
                      <Text style={styles.wrongAnswer}>{wa.selectedKeys.join(', ')}</Text>
                    </View>
                    <View style={styles.wrongRow}>
                      <Text style={styles.wrongLabel}>正确答案：</Text>
                      <Text style={styles.correctAnswer}>{wa.correctKeys.join(', ')}</Text>
                    </View>
                    {wa.question.analysis && (
                      <View style={styles.analysisBox}>
                        <Text style={styles.analysisText}>{wa.question.analysis}</Text>
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
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>再练一次</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.continueText}>继续学习</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  noResultText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  wrongSection: {
    marginBottom: 20,
  },
  wrongTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  wrongItem: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
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
    color: '#374151',
  },
  expandIcon: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  wrongDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  wrongRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  wrongLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 75,
  },
  wrongAnswer: {
    fontSize: 13,
    color: '#DC2626',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  analysisText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
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
