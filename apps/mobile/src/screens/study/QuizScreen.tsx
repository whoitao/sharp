import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ElapsedTimer from '../../components/ElapsedTimer';
import ProgressBar from '../../components/ProgressBar';
import QuizOption from '../../components/QuizOption';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudyStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { store as reduxStore } from '../../stores';
import { finishQuiz, recordAnswer, setCurrentIndex } from '../../stores/studySlice';

type NavigationProp = NativeStackNavigationProp<StudyStackParamList, 'Quiz'>;
type QuizRouteProp = RouteProp<StudyStackParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: NavigationProp;
  route: QuizRouteProp;
}

type OptionStatus = 'default' | 'selected' | 'correct' | 'wrong' | 'revealed';

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { spacing, font, radius } = useDensity();
  const { categoryId, unitIndex, categoryName, subjectId, knowledgePointId } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentQuestions, currentIndex, answers, isLoading } = useSelector(
    (state: RootState) => state.study
  );

  const [optionStatuses, setOptionStatuses] = useState<Record<string, OptionStatus>>({});
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const pendingNextRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  // 计时秒数由 ElapsedTimer 自己维护，这里只保留最新值供交卷时使用
  const elapsedRef = useRef(0);
  const [timerRunning, setTimerRunning] = useState(true);

  const currentQuestion = currentQuestions[currentIndex] ?? null;
  const totalQuestions = currentQuestions.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  // QuestionType.MULTIPLE_CHOICE = 2
  const isMultipleChoice = currentQuestion?.type === 2;

  // 卸载时取消待执行的切题任务
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pendingNextRef.current) clearTimeout(pendingNextRef.current);
    };
  }, []);

  // Reset option statuses when question changes
  useEffect(() => {
    if (pendingNextRef.current) {
      clearTimeout(pendingNextRef.current);
      pendingNextRef.current = null;
    }
    setOptionStatuses({});
    setSelectedKeys([]);
    setAnswered(false);
    setShowNextButton(false);
  }, [currentIndex]);

  const handleElapsed = useCallback((seconds: number) => {
    elapsedRef.current = seconds;
  }, []);

  const handleFinish = useCallback(() => {
    setTimerRunning(false);
    if (pendingNextRef.current) {
      clearTimeout(pendingNextRef.current);
      pendingNextRef.current = null;
    }
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
        durationSeconds: elapsedRef.current,
        answers: answerItems,
      })
      .catch(() => {});

    navigation.navigate('QuizResult', {
      categoryId,
      unitIndex,
      categoryName,
      subjectId,
      knowledgePointId,
    });
  }, [dispatch, navigation, categoryId, unitIndex, categoryName, subjectId, knowledgePointId]);

  const goNextQuestion = useCallback(() => {
    if (isLastQuestion) {
      handleFinish();
    } else {
      dispatch(setCurrentIndex(currentIndex + 1));
    }
  }, [isLastQuestion, currentIndex, dispatch, handleFinish]);

  // 正确答题后延迟切题；卸载或切题时取消，避免对已卸载屏幕 dispatch/navigate 报错
  const scheduleNext = useCallback(() => {
    if (pendingNextRef.current) clearTimeout(pendingNextRef.current);
    pendingNextRef.current = setTimeout(() => {
      pendingNextRef.current = null;
      if (isMountedRef.current) goNextQuestion();
    }, 500);
  }, [goNextQuestion]);

  const handleNext = () => {
    goNextQuestion();
  };

  const handleOptionPress = useCallback(
    (optionKey: string) => {
      if (answered || !currentQuestion) return;

      // 多选题：点击切换选中状态，统一提交后再判分
      if (isMultipleChoice) {
        setSelectedKeys((prev) =>
          prev.includes(optionKey)
            ? prev.filter((key) => key !== optionKey)
            : [...prev, optionKey]
        );
        return;
      }

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

        scheduleNext();
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
    [answered, currentQuestion, isMultipleChoice, scheduleNext, dispatch]
  );

  const handleSubmitMultiple = useCallback(() => {
    if (answered || !currentQuestion || selectedKeys.length === 0) return;

    const correctKeys = currentQuestion.options
      .filter((o) => o.isCorrect)
      .map((o) => o.optionKey);
    const isCorrect =
      selectedKeys.length === correctKeys.length &&
      selectedKeys.every((key) => correctKeys.includes(key));

    const statuses: Record<string, OptionStatus> = {};
    currentQuestion.options.forEach((o) => {
      if (correctKeys.includes(o.optionKey)) {
        statuses[o.optionKey] = 'correct';
      } else if (selectedKeys.includes(o.optionKey)) {
        statuses[o.optionKey] = 'wrong';
      }
    });

    setAnswered(true);
    setOptionStatuses(statuses);
    dispatch(
      recordAnswer({
        questionId: currentQuestion.id,
        selectedKeys,
        correct: isCorrect,
      })
    );

    if (isCorrect) {
      scheduleNext();
    } else {
      setShowNextButton(true);
    }
  }, [answered, currentQuestion, selectedKeys, scheduleNext, dispatch]);

  const handleQuit = () => {
    if (pendingNextRef.current) {
      clearTimeout(pendingNextRef.current);
      pendingNextRef.current = null;
    }
    Alert.alert(t.quitQuizTitle, t.quitQuizConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.quitConfirm,
        style: 'destructive',
        onPress: () => {
          setTimerRunning(false);
          navigation.goBack();
        },
      },
    ]);
  };

  if (isLoading || !currentQuestion) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t.loadingQuestions}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingHorizontal: 16 * spacing, paddingVertical: 12 * spacing }]}>
        <TouchableOpacity onPress={handleQuit} style={[styles.quitButton, { paddingVertical: 6 * spacing, paddingHorizontal: 12 * spacing }]}>
          <Text style={[styles.quitText, { color: colors.error, fontSize: 15 * font }]}>{t.quit}</Text>
        </TouchableOpacity>
        <ElapsedTimer
          running={timerRunning}
          onElapsed={handleElapsed}
          color={colors.text}
          fontSize={16 * font}
        />
        <View style={styles.quitButton} />
      </View>

      {/* Progress */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* Question content */}
      <View style={[styles.questionContainer, { backgroundColor: colors.surface, marginHorizontal: 16 * spacing, marginTop: 12 * spacing, borderRadius: 12 * radius, paddingHorizontal: 20 * spacing, paddingVertical: 24 * spacing }]}>
        <Text style={[styles.questionContent, { color: colors.text, fontSize: 18 * font }]}>{currentQuestion.content}</Text>
      </View>

      {/* Options */}
      <View style={[styles.optionsContainer, { paddingHorizontal: 16 * spacing, paddingTop: 20 * spacing }]}>
        {[...currentQuestion.options]
          .sort((a, b) => a.sortNo - b.sortNo)
          .map((option) => {
            const status: OptionStatus =
              optionStatuses[option.optionKey] ??
              (isMultipleChoice && !answered && selectedKeys.includes(option.optionKey)
                ? 'selected'
                : 'default');
            return (
              <QuizOption
                key={option.id}
                optionKey={option.optionKey}
                content={option.content}
                status={status}
                disabled={answered}
                onPress={() => handleOptionPress(option.optionKey)}
              />
            );
          })}
      </View>

      {/* Submit button for multiple choice questions */}
      {isMultipleChoice && !answered && (
        <View style={[styles.nextContainer, { paddingHorizontal: 16 * spacing, paddingVertical: 12 * spacing }]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                paddingHorizontal: 48 * spacing,
                backgroundColor:
                  selectedKeys.length === 0 ? colors.border : colors.primary,
                borderRadius: 10 * radius,
                paddingVertical: 14 * spacing,
              },
            ]}
            onPress={handleSubmitMultiple}
            disabled={selectedKeys.length === 0}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.nextButtonText,
                { fontSize: 16 * font },
                selectedKeys.length === 0 && { color: colors.textTertiary },
              ]}
            >
              {t.submitAnswer}
              {selectedKeys.length > 0 ? t.selectedCount(selectedKeys.length) : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next button (shown only on wrong answer) */}
      {showNextButton && (
        <View style={[styles.nextContainer, { paddingHorizontal: 16 * spacing, paddingVertical: 12 * spacing }]}>
          <TouchableOpacity style={[styles.nextButton, { paddingHorizontal: 48 * spacing, backgroundColor: colors.primary, borderRadius: 10 * radius, paddingVertical: 14 * spacing }]} onPress={handleNext} activeOpacity={0.8}>
            <Text style={[styles.nextButtonText, { fontSize: 16 * font }]}>
              {isLastQuestion ? t.viewResult : t.nextQuestion}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis (shown after answering) */}
      {answered && !!currentQuestion.analysis && (
        <View style={[styles.analysisContainer, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary, marginHorizontal: 16 * spacing, marginBottom: 16 * spacing, padding: 14 * spacing, borderRadius: 10 * radius }]}>
          <Text style={[styles.analysisLabel, { color: colors.primary, fontSize: 13 * font, marginBottom: 6 * spacing }]}>{t.analysis}</Text>
          <Text style={[styles.analysisText, { color: colors.text, fontSize: 14 * font, lineHeight: 22 * font }]}>{currentQuestion.analysis}</Text>
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
