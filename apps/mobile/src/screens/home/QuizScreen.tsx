import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { setCurrentIndex, recordAnswer, finishQuiz } from '../../stores/studySlice';
import { api } from '../../services/api';
import { store as reduxStore } from '../../stores';
import type { RootState, AppDispatch } from '../../stores';
import ProgressBar from '../../components/ProgressBar';
import QuizOption from '../../components/QuizOption';
import { useTheme } from '../../hooks/useTheme';
import type { HomeStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Quiz'>;
type QuizRouteProp = RouteProp<HomeStackParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: NavigationProp;
  route: QuizRouteProp;
}

type OptionStatus = 'default' | 'correct' | 'wrong' | 'revealed';

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { categoryId, unitIndex, categoryName } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentQuestions, currentIndex, answers, isLoading } = useSelector(
    (state: RootState) => state.study
  );

  const [optionStatuses, setOptionStatuses] = useState<Record<string, OptionStatus>>({});
  const [answered, setAnswered] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const currentQuestion = currentQuestions[currentIndex] ?? null;
  const totalQuestions = currentQuestions.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset option statuses when question changes
  useEffect(() => {
    setOptionStatuses({});
    setAnswered(false);
    setShowNextButton(false);
  }, [currentIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionPress = useCallback(
    (optionKey: string) => {
      if (answered || !currentQuestion) return;
      setAnswered(true);

      const correctOption = currentQuestion.options.find((o) => o.isCorrect);
      const correctKey = correctOption?.optionKey ?? '';
      const isCorrect = optionKey === correctKey;

      if (isCorrect) {
        setOptionStatuses({ [optionKey]: 'correct' });
        dispatch(
          recordAnswer({
            questionId: currentQuestion.id,
            selectedKeys: [optionKey],
            correct: true,
          })
        );

        setTimeout(() => {
          if (isLastQuestion) {
            handleFinish();
          } else {
            dispatch(setCurrentIndex(currentIndex + 1));
          }
        }, 500);
      } else {
        const statuses: Record<string, OptionStatus> = {
          [optionKey]: 'wrong',
          [correctKey]: 'revealed',
        };
        setOptionStatuses(statuses);
        setShowNextButton(true);
        dispatch(
          recordAnswer({
            questionId: currentQuestion.id,
            selectedKeys: [optionKey],
            correct: false,
          })
        );
      }
    },
    [answered, currentQuestion, currentIndex, isLastQuestion, dispatch]
  );

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    dispatch(finishQuiz());

    const latestState = reduxStore.getState().study;
    const latestAnswers = latestState.answers;
    const latestQuestions = latestState.currentQuestions;

    const answerItems: { questionId: string; selectedKeys: string[]; isCorrect: boolean }[] = [];
    const stats = latestQuestions.reduce(
      (acc, q) => {
        const answer = latestAnswers[q.id];
        if (answer) {
          answerItems.push({
            questionId: q.id,
            selectedKeys: answer.selectedKeys,
            isCorrect: answer.correct,
          });
          if (answer.correct) acc.correctCount++;
          else acc.wrongCount++;
        }
        return acc;
      },
      { correctCount: 0, wrongCount: 0 }
    );

    api
      .finishStudy(categoryId, unitIndex, {
        ...stats,
        durationSeconds: elapsedSeconds,
        answers: answerItems,
      })
      .catch(() => {});

    navigation.navigate('QuizResult', {
      categoryId,
      unitIndex,
      categoryName,
    });
  }, [dispatch, navigation, categoryId, unitIndex, categoryName, elapsedSeconds]);

  const handleNext = () => {
    if (isLastQuestion) {
      handleFinish();
    } else {
      dispatch(setCurrentIndex(currentIndex + 1));
    }
  };

  const handleQuit = () => {
    Alert.alert('退出练习', '确定要退出当前练习吗？进度将不会保存。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定退出',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  if (isLoading || !currentQuestion) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载题目中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleQuit} style={styles.quitButton}>
          <Text style={[styles.quitText, { color: colors.error }]}>退出</Text>
        </TouchableOpacity>
        <Text style={[styles.timer, { color: colors.text }]}>{formatTime(elapsedSeconds)}</Text>
        <View style={styles.quitButton} />
      </View>

      {/* Progress */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* Question content */}
      <View style={[styles.questionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.questionContent, { color: colors.text }]}>{currentQuestion.content}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {currentQuestion.options
          .sort((a, b) => a.sortNo - b.sortNo)
          .map((option) => (
            <QuizOption
              key={option.id}
              optionKey={option.optionKey}
              content={option.content}
              status={optionStatuses[option.optionKey] ?? 'default'}
              disabled={answered}
              onPress={() => handleOptionPress(option.optionKey)}
            />
          ))}
      </View>

      {/* Next button (shown only on wrong answer) */}
      {showNextButton && (
        <View style={styles.nextContainer}>
          <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? '查看结果' : '下一题 →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis (shown after answering) */}
      {answered && currentQuestion.analysis && (
        <View style={[styles.analysisContainer, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
          <Text style={[styles.analysisLabel, { color: colors.primary }]}>解析</Text>
          <Text style={[styles.analysisText, { color: colors.text }]}>{currentQuestion.analysis}</Text>
        </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  quitButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 50,
  },
  quitText: {
    fontSize: 15,
    fontWeight: '500',
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  questionContent: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  nextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  analysisContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  analysisLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default QuizScreen;
