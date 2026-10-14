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
import type { HomeStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Quiz'>;
type QuizRouteProp = RouteProp<HomeStackParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: NavigationProp;
  route: QuizRouteProp;
}

type OptionStatus = 'default' | 'correct' | 'wrong' | 'revealed';

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
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
    async (optionKey: string) => {
      if (answered || !currentQuestion) return;
      setAnswered(true);

      const correctOption = currentQuestion.options.find((o) => o.isCorrect);
      const correctKey = correctOption?.optionKey ?? '';

      try {
        const result = await api.submitAnswer(currentQuestion.id, [optionKey]);

        if (result.isCorrect) {
          // Correct answer
          setOptionStatuses({ [optionKey]: 'correct' });
          dispatch(
            recordAnswer({
              questionId: currentQuestion.id,
              selectedKeys: [optionKey],
              correct: true,
            })
          );

          // Auto-advance after 500ms
          setTimeout(() => {
            if (isLastQuestion) {
              handleFinish();
            } else {
              dispatch(setCurrentIndex(currentIndex + 1));
            }
          }, 500);
        } else {
          // Wrong answer
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
      } catch {
        // On error, treat as wrong
        const statuses: Record<string, OptionStatus> = {
          [optionKey]: 'wrong',
        };
        if (correctKey) {
          statuses[correctKey] = 'revealed';
        }
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

    // Get latest state from Redux store to avoid stale closure
    const latestState = reduxStore.getState().study;
    const latestAnswers = latestState.answers;
    const latestQuestions = latestState.currentQuestions;

    // Submit study results to backend
    const stats = latestQuestions.reduce(
      (acc, q) => {
        const answer = latestAnswers[q.id];
        if (answer) {
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>加载题目中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={styles.quitButton}>
          <Text style={styles.quitText}>退出</Text>
        </TouchableOpacity>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        <View style={styles.quitButton} />
      </View>

      {/* Progress */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* Question content */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionContent}>{currentQuestion.content}</Text>
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
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? '查看结果' : '下一题 →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis (shown after answering) */}
      {answered && currentQuestion.analysis && (
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisLabel}>解析</Text>
          <Text style={styles.analysisText}>{currentQuestion.analysis}</Text>
        </View>
      )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quitButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 50,
  },
  quitText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '500',
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
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
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  analysisLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 6,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
});

export default QuizScreen;
