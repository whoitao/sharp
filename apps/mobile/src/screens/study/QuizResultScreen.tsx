import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StudyRecordSummary } from '@sharp/shared';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import RichTextView from '../../components/RichTextView';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudyStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { fetchQuestions, resetStudy } from '../../stores/studySlice';
import { htmlToText } from '../../utils/richText';

type NavigationProp = NativeStackNavigationProp<StudyStackParamList, 'QuizResult'>;
type QuizResultRouteProp = RouteProp<StudyStackParamList, 'QuizResult'>;

interface QuizResultScreenProps {
  navigation: NavigationProp;
  route: QuizResultRouteProp;
}

const QuizResultScreen: React.FC<QuizResultScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const { categoryId, unitIndex, categoryName, subjectId, knowledgePointId, record } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { result: liveResult } = useSelector((state: RootState) => state.study);

  const [expandedWrong, setExpandedWrong] = useState<Record<string, boolean>>({});

  // 查看历史学习记录时，使用记录中的汇总数据（不含错题详情）
  const recordResult = record
    ? {
        totalQuestions: record.totalQuestions,
        correctCount: record.correctCount,
        wrongCount: record.wrongCount,
        durationSeconds: record.durationSeconds,
        wrongAnswers: [] as { question: any; selectedKeys: string[]; correctKeys: string[] }[],
      }
    : null;

  const result = recordResult ?? liveResult;
  const isRecordView = !!record;

  if (!result) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.noResultText, { color: colors.textSecondary, fontSize: 16 * font, marginBottom: 16 * spacing }]}>{t.noResultData}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary, borderRadius: 10 * radius, paddingVertical: 12 * spacing, paddingHorizontal: 32 * spacing }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { fontSize: 15 * font }]}>{t.back}</Text>
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
      return `${mins}${t.minuteShort}${secs}${t.secondShort}`;
    }
    return `${secs}${t.secondShort}`;
  };

  const getScoreColor = (): string => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 60) return colors.warning;
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
    let previousRecord: StudyRecordSummary | null = null;
    try {
      // 复用同一条学习记录：刚完成的成绩作为「上次学习」带入答题页
      previousRecord = (
        await api.startStudy(categoryId, unitIndex, subjectId, knowledgePointId)
      ).previous;
    } catch {
      // silently proceed even if start fails
    }
    const fetchResult = await dispatch(
      fetchQuestions({ categoryId, unitIndex, subjectId, knowledgePointId })
    );
    if (fetchQuestions.fulfilled.match(fetchResult)) {
      navigation.replace('Quiz', {
        categoryId,
        unitIndex,
        categoryName: categoryName ?? '',
        subjectId,
        knowledgePointId,
        previousRecord,
      });
    }
  };

  const handleContinue = () => {
    dispatch(resetStudy());
    if (isRecordView) {
      // 从学习记录进入时，返回记录列表
      (navigation as any).navigate('ProfileTab', { screen: 'Records' });
    } else {
      navigation.popTo('Study');
    }
  };

  const toggleWrong = (questionId: string) => {
    setExpandedWrong((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={[styles.content, { padding: 16 * spacing, paddingTop: 0, paddingBottom: 32 * spacing }]}>
      {/* Score card */}
      <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderRadius: 16 * radius, padding: 32 * spacing, marginBottom: 20 * spacing }]}>
        <Text style={[styles.scoreEmoji, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>{getScoreEmoji()}</Text>
        <Text style={[styles.percentage, { color: getScoreColor(), fontSize: 48 * font, marginBottom: 4 * spacing }]}>
          {percentage}%
        </Text>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary, fontSize: 15 * font, marginBottom: 24 * spacing }]}>{t.accuracyRate}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statItem, { paddingHorizontal: 16 * spacing }]}>
            <Text style={[styles.statValue, { color: colors.text, fontSize: 20 * font, marginBottom: 4 * spacing }]}>{result.correctCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>{t.statCorrect}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border, height: 32 * spacing }]} />
          <View style={[styles.statItem, { paddingHorizontal: 16 * spacing }]}>
            <Text style={[styles.statValue, { color: colors.error, fontSize: 20 * font, marginBottom: 4 * spacing }]}>
              {result.wrongCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>{t.statWrong}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border, height: 32 * spacing }]} />
          <View style={[styles.statItem, { paddingHorizontal: 16 * spacing }]}>
            <Text style={[styles.statValue, { color: colors.text, fontSize: 20 * font, marginBottom: 4 * spacing }]}>{result.totalQuestions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>{t.statTotal}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border, height: 32 * spacing }]} />
          <View style={[styles.statItem, { paddingHorizontal: 16 * spacing }]}>
            <Text style={[styles.statValue, { color: colors.text, fontSize: 20 * font, marginBottom: 4 * spacing }]}>{formatTime(result.durationSeconds)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>{t.statDuration}</Text>
          </View>
        </View>
      </View>

      {/* Wrong questions */}
      {result.wrongAnswers.length > 0 && (
        <View style={[styles.wrongSection, { marginBottom: 20 * spacing }]}>
          <Text style={[styles.wrongTitle, { color: colors.text, fontSize: 18 * font, marginBottom: 12 * spacing }]}>
            {t.wrongReviewTitle(result.wrongAnswers.length)}
          </Text>
          {result.wrongAnswers.map((wa, idx) => {
            const isExpanded = expandedWrong[wa.question.id];
            return (
              <TouchableOpacity
                key={wa.question.id}
                style={[styles.wrongItem, { backgroundColor: colors.surface, borderRadius: 10 * radius, marginBottom: 8 * spacing }]}
                onPress={() => toggleWrong(wa.question.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.wrongHeader, { padding: 14 * spacing }]}>
                  <View style={[styles.wrongIndex, { backgroundColor: colors.errorLight, width: 28 * spacing, height: 28 * spacing, borderRadius: 14 * spacing, marginRight: 10 * spacing }]}>
                    <Text style={{ color: colors.error, fontSize: 13 * font, fontWeight: '600', textAlign: 'center', lineHeight: 28 * spacing }}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.wrongContent, { color: colors.text, fontSize: 14 * font }]} numberOfLines={1}>
                    {htmlToText(wa.question.content)}
                  </Text>
                  <Text style={[styles.expandIcon, { color: colors.textTertiary, fontSize: 12 * font, marginLeft: 8 * spacing }]}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded && (
                  <View style={[styles.wrongDetail, { borderTopColor: colors.borderLight, paddingHorizontal: 14 * spacing, paddingBottom: 14 * spacing, paddingTop: 12 * spacing }]}>
                    <View style={[styles.wrongRow, { marginBottom: 6 * spacing }]}>
                      <Text style={[styles.wrongLabel, { color: colors.textSecondary, fontSize: 13 * font, width: 75 * font }]}>{t.yourAnswer}</Text>
                      <Text style={[styles.wrongAnswer, { color: colors.error, fontSize: 13 * font }]}>{wa.selectedKeys.join(', ')}</Text>
                    </View>
                    <View style={[styles.wrongRow, { marginBottom: 6 * spacing }]}>
                      <Text style={[styles.wrongLabel, { color: colors.textSecondary, fontSize: 13 * font, width: 75 * font }]}>{t.correctAnswerLabel}</Text>
                      <Text style={[styles.correctAnswer, { color: colors.success, fontSize: 13 * font }]}>{wa.correctKeys.join(', ')}</Text>
                    </View>
                    {!!wa.question.analysis && (
                      <View style={[styles.analysisBox, { backgroundColor: colors.background, marginTop: 8 * spacing, padding: 10 * spacing, borderRadius: 8 * radius }]}>
                        <RichTextView
                          html={wa.question.analysis}
                          fontSize={13 * font}
                          lineHeight={20 * font}
                          color={colors.text}
                          style={styles.analysisText}
                        />
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
      <View style={[styles.actions, { gap: 12 * spacing }]}>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.surface, borderColor: colors.accent, borderRadius: 12 * radius, paddingVertical: 16 * spacing }]} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={[styles.retryText, { color: colors.accent, fontSize: 16 * font }]}>{t.retry}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.accent, borderRadius: 12 * radius, paddingVertical: 16 * spacing }]} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={[styles.continueText, { fontSize: 16 * font }]}>{isRecordView ? t.back : t.continueStudy}</Text>
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
