import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ElapsedTimer from '../../components/ElapsedTimer';
import ProgressBar from '../../components/ProgressBar';
import QuizOption from '../../components/QuizOption';
import RichTextView from '../../components/RichTextView';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { QuizParams, QuizResultParams } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { store as reduxStore } from '../../stores';
import { finishQuiz, recordAnswer, restartQuiz, setCurrentIndex } from '../../stores/studySlice';

type QuizParamList = { Quiz: QuizParams; QuizResult: QuizResultParams };
type NavigationProp = NativeStackNavigationProp<QuizParamList, 'Quiz'>;
type QuizRouteProp = RouteProp<QuizParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: NavigationProp;
  route: QuizRouteProp;
}

type OptionStatus = 'default' | 'selected' | 'correct' | 'wrong' | 'revealed';

// Web 端没有原生动画模块，使用 JS 驱动避免告警
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { spacing, font, radius } = useDensity();
  const {
    chapterId,
    unitIndex,
    chapterName,
    textbookLabel,
    subjectId,
    gradeId,
    tagIds,
    knowledgePointId,
    continueTo,
  } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentQuestions, currentIndex, answers, isLoading } = useSelector(
    (state: RootState) => state.study
  );

  const [optionStatuses, setOptionStatuses] = useState<Record<string, OptionStatus>>({});
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const pendingNextRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  // 计时秒数由 ElapsedTimer 自己维护，这里只保留最新值供交卷时使用
  const elapsedRef = useRef(0);
  const [timerRunning, setTimerRunning] = useState(true);
  // 使用应用内弹窗确认退出（浏览器端不支持 Alert.alert）
  const [quitConfirmVisible, setQuitConfirmVisible] = useState(false);
  // 再学一次：确认弹窗；attempt 用作计时器的 key，变化即从 00:00 重新计时
  const [restartConfirmVisible, setRestartConfirmVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // 上次已完成的学习记录（由 StudyScreen 进入时带上，仅用于展示摘要与「再学一次」）
  const previous = route.params.previousRecord ?? null;

  const currentQuestion = currentQuestions[currentIndex] ?? null;
  const totalQuestions = currentQuestions.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  // QuestionType.MULTIPLE_CHOICE = 2
  const isMultipleChoice = currentQuestion?.type === 2;

  // 上次学习摘要的日期 / 用时格式，与学习记录列表保持一致
  const formatRecordDate = (iso: string): string => {
    const date = new Date(iso);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${t.monthDay(date.getMonth() + 1, date.getDate())} ${t.clockTime(hours, minutes)}`;
  };

  const formatRecordDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}${t.minuteShort}${secs}${t.secondShort}`;
    return `${secs}${t.secondShort}`;
  };

  // 卸载时取消待执行的切题任务
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pendingNextRef.current) clearTimeout(pendingNextRef.current);
    };
  }, []);

  // 切换题目时重置状态；若回到已答过的题目，则还原当时的作答结果
  useEffect(() => {
    if (pendingNextRef.current) {
      clearTimeout(pendingNextRef.current);
      pendingNextRef.current = null;
    }

    const study = reduxStore.getState().study;
    const question = study.currentQuestions[currentIndex];
    const answer = question ? study.answers[question.id] : undefined;

    if (question && answer) {
      const statuses: Record<string, OptionStatus> = {};
      question.options.forEach((o) => {
        if (o.isCorrect) {
          // 单选题答错时正确答案用 revealed（与首次作答一致），多选题用 correct
          statuses[o.optionKey] = answer.correct || question.type === 2 ? 'correct' : 'revealed';
        } else if (answer.selectedKeys.includes(o.optionKey)) {
          statuses[o.optionKey] = 'wrong';
        }
      });
      setOptionStatuses(statuses);
      setSelectedKeys(answer.selectedKeys);
      setAnswered(true);
      return;
    }

    setOptionStatuses({});
    setSelectedKeys([]);
    setAnswered(false);
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

    if (chapterId) {
      // 教材章节练习：记录去重键为 chapterId + unitIndex
      api
        .finishChapterStudy(chapterId, unitIndex, {
          ...stats,
          durationSeconds: elapsedRef.current,
          answers: answerItems,
          subjectId,
        })
        .catch(() => {});
    } else if (subjectId) {
      api
        .finishStudy(unitIndex, {
          ...stats,
          durationSeconds: elapsedRef.current,
          answers: answerItems,
          subjectId,
          gradeId,
          tagIds,
          knowledgePointId,
        })
        .catch(() => {});
    }

    navigation.navigate('QuizResult', {
      chapterId,
      chapterName,
      textbookLabel,
      unitIndex,
      subjectId,
      gradeId,
      tagIds,
      knowledgePointId,
      continueTo,
    });
  }, [
    dispatch,
    navigation,
    chapterId,
    chapterName,
    textbookLabel,
    unitIndex,
    subjectId,
    gradeId,
    tagIds,
    knowledgePointId,
    continueTo,
  ]);

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

  // ===== 左右滑动切题 =====
  // 触发切题所需的最小横向位移
  const SWIPE_DISTANCE = 60;
  // 拖动位移上限（容器宽度的 26%）：避免滑出后露出大片空白
  const MAX_DRAG_RATIO = 0.26;
  // 切题时新内容从反方向推入的距离
  const SLIDE_IN_DISTANCE = 48;
  // 横向判定：位移足够且明显大于纵向，避免抢走上下滚动
  const isHorizontalSwipe = (dx: number, dy: number) =>
    Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2;

  const translateX = useRef(new Animated.Value(0)).current;
  // 内容区实测宽度（浏览器里 window 宽度远大于 App 容器宽度，不能直接用 Dimensions）
  const swipeWidthRef = useRef(0);
  // 手势回调创建一次，用 ref 读取最新的题目索引与切题动作
  const swipeActionsRef = useRef({
    index: 0,
    total: 0,
    answered: false,
    next: () => {},
    prev: () => {},
  });
  swipeActionsRef.current = {
    index: currentIndex,
    total: totalQuestions,
    answered,
    next: goNextQuestion,
    prev: () => {
      if (pendingNextRef.current) {
        clearTimeout(pendingNextRef.current);
        pendingNextRef.current = null;
      }
      dispatch(setCurrentIndex(currentIndex - 1));
    },
  };

  // dir=-1 左滑（下一题），dir=1 右滑（上一题）
  // 同步切题：不依赖动画完成回调，避免动画被中断后手势被锁死
  const slideTo = useCallback(
    (dir: -1 | 1) => {
      translateX.stopAnimation();
      translateX.setValue(0);
      const { next, prev } = swipeActionsRef.current;
      if (dir === -1) next();
      else prev();
      // 新题目从滑动方向的反侧轻推入位
      translateX.setValue(-dir * SLIDE_IN_DISTANCE);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 160,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    },
    [translateX]
  );

  const panResponder = useRef(
    PanResponder.create({
      // capture 阶段先判定，避免内部的 ScrollView / 选项按钮抢走横向手势
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        isHorizontalSwipe(gesture.dx, gesture.dy),
      // 仅当横向位移明显大于纵向时才接管，避免和上下滚动冲突
      onMoveShouldSetPanResponder: (_, gesture) => isHorizontalSwipe(gesture.dx, gesture.dy),
      onPanResponderGrant: () => {
        // 打断可能还在播放的切题动画，保证拖动从当前位移开始
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        const { index, total } = swipeActionsRef.current;
        const atStart = index === 0 && gesture.dx > 0;
        const atEnd = index === total - 1 && gesture.dx < 0;
        // 边界处加阻尼，提示不可再滑
        const raw = atStart || atEnd ? gesture.dx * 0.3 : gesture.dx;
        // 限制最大位移，滑动过程中不会露出大面积空白
        const width = swipeWidthRef.current || Dimensions.get('window').width;
        const limit = width * MAX_DRAG_RATIO;
        translateX.setValue(Math.max(-limit, Math.min(limit, raw)));
      },
      onPanResponderRelease: (_, gesture) => {
        const { index, total, answered: currentAnswered } = swipeActionsRef.current;
        // 最后一题已作答时左滑等同「查看结果」
        if (gesture.dx <= -SWIPE_DISTANCE && (index < total - 1 || currentAnswered)) {
          slideTo(-1);
          return;
        }
        if (gesture.dx >= SWIPE_DISTANCE && index > 0) {
          slideTo(1);
          return;
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

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
    }
  }, [answered, currentQuestion, selectedKeys, scheduleNext, dispatch]);

  const handleQuit = () => {
    if (pendingNextRef.current) {
      clearTimeout(pendingNextRef.current);
      pendingNextRef.current = null;
    }
    setQuitConfirmVisible(true);
  };

  const confirmQuit = () => {
    setQuitConfirmVisible(false);
    setTimerRunning(false);
    navigation.goBack();
  };

  const handleRestartPress = () => {
    setRestartConfirmVisible(true);
  };

  const confirmRestart = () => {
    setRestartConfirmVisible(false);
    if (pendingNextRef.current) {
      clearTimeout(pendingNextRef.current);
      pendingNextRef.current = null;
    }
    // 服务端清掉本单元之前的学习记录，本次从第一题重新开始
    if (chapterId) {
      api.restartChapterStudy(chapterId, unitIndex, subjectId).catch(() => {});
    } else if (subjectId) {
      api
        .restartStudy({
          unitIndex,
          subjectId,
          gradeId,
          knowledgePointId,
          tagIds,
        })
        .catch(() => {});
    }
    dispatch(restartQuiz());
    setOptionStatuses({});
    setSelectedKeys([]);
    setAnswered(false);
    elapsedRef.current = 0;
    // 换 key 重挂计时器，让显示回到 00:00
    setAttempt((n) => n + 1);
    setTimerRunning(true);
    // 清掉参数，摘要条随之消失
    navigation.setParams({ previousRecord: null });
  };

  if (isLoading || !currentQuestion) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t.loadingQuestions}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingHorizontal: 16 * spacing, paddingVertical: 12 * spacing }]}>
        <TouchableOpacity onPress={handleQuit} style={[styles.quitButton, { paddingVertical: 6 * spacing, paddingHorizontal: 12 * spacing }]}>
          <Text style={[styles.quitText, { color: colors.error, fontSize: 15 * font }]}>{t.quit}</Text>
        </TouchableOpacity>
        <ElapsedTimer
          key={attempt}
          running={timerRunning}
          onElapsed={handleElapsed}
          color={colors.text}
          fontSize={16 * font}
        />
        {previous ? (
          <TouchableOpacity
            onPress={handleRestartPress}
            style={[styles.quitButton, { paddingVertical: 6 * spacing, paddingHorizontal: 12 * spacing }]}
          >
            <Text style={[styles.quitText, styles.restartText, { color: colors.accentStrong, fontSize: 15 * font }]}>
              {t.studyAgain}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quitButton} />
        )}
      </View>

      {/* 内容区域可滚动；左右滑动切换上一题 / 下一题 */}
      {/* 外层裁切 overflow，避免横向位移时内容溢出到容器外 */}
      <View
        style={styles.swipeArea}
        onLayout={(e) => {
          swipeWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[styles.scroll, { transform: [{ translateX }] }]}
        >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 * spacing }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Progress */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* 上次学习摘要：仅在本单元有已完成的记录时出现 */}
      {previous && (
        <View
          style={[
            styles.previousCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginHorizontal: 16 * spacing,
              marginTop: 10 * spacing,
              borderRadius: 10 * radius,
              paddingVertical: 10 * spacing,
              paddingHorizontal: 14 * spacing,
            },
          ]}
        >
          <View style={styles.previousRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 * font }}>{t.previousStudy}</Text>
            <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
              {formatRecordDate(previous.finishedAt)}
            </Text>
          </View>
          <View style={[styles.previousRow, { marginTop: 4 * spacing }]}>
            <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '600' }}>
              {t.previousStudyScore(previous.correctCount, previous.totalQuestions)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>
              {t.previousStudyDuration(formatRecordDuration(previous.durationSeconds))}
            </Text>
          </View>
        </View>
      )}

      {/* Question content */}
      <View style={[styles.questionContainer, { backgroundColor: colors.surface, marginHorizontal: 16 * spacing, marginTop: 0, borderRadius: 12 * radius, paddingHorizontal: 20 * spacing, paddingVertical: 20 * spacing }]}>
        {/* 题目头部：左侧难度星级，右侧题型 */}
        <View style={[styles.questionMeta, { marginBottom: 10 * spacing }]}>
          <View style={styles.questionMetaLeft}>
            <Text style={[styles.questionMetaLabel, { color: colors.textSecondary, fontSize: 12 * font }]}>
              {t.difficultyLabel}
            </Text>
            {Array.from({ length: 5 }, (_, i) => (
              <Text
                key={i}
                style={[
                  styles.questionStar,
                  {
                    fontSize: 14 * font,
                    marginRight: 2 * spacing,
                    color: i < (currentQuestion.difficulty ?? 0) ? '#F59E0B' : colors.border,
                  },
                ]}
              >
                ★
              </Text>
            ))}
          </View>
          <Text style={[styles.questionType, { color: colors.textTertiary, fontSize: 12 * font }]}>
            {isMultipleChoice ? t.multipleChoice : t.singleChoice}
          </Text>
        </View>
        <RichTextView
          html={currentQuestion.content}
          fontSize={18 * font}
          lineHeight={28 * font}
          color={colors.text}
          style={styles.questionContent}
        />
      </View>

      {/* Options */}
      <View style={[styles.optionsContainer, { paddingHorizontal: 16 * spacing, paddingTop: 16 * spacing }]}>
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
                borderRadius: 12 * radius,
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

      {/* Analysis (shown after answering) */}
      {answered && !!currentQuestion.analysis && (
        <View style={[styles.analysisContainer, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary, marginHorizontal: 16 * spacing, marginBottom: 16 * spacing, padding: 14 * spacing, borderRadius: 10 * radius }]}>
          <Text style={[styles.analysisLabel, { color: colors.primary, fontSize: 13 * font, marginBottom: 6 * spacing }]}>{t.analysis}</Text>
          <RichTextView
            html={currentQuestion.analysis}
            fontSize={14 * font}
            lineHeight={22 * font}
            color={colors.text}
            style={styles.analysisText}
          />
        </View>
      )}

      {/* 滑动切题提示 */}
      {totalQuestions > 1 && (
        <Text style={[styles.swipeHint, { color: colors.textTertiary, fontSize: 12 * font, marginTop: 4 * spacing, marginBottom: 4 * spacing }]}>
          {t.swipeHint}
        </Text>
      )}
      </ScrollView>
        </Animated.View>
      </View>

      {/* 退出确认 */}
      <Modal
        visible={quitConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuitConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderRadius: 12 * radius, padding: 20 * spacing }]}>
            <Text style={[styles.confirmTitle, { color: colors.text, fontSize: 17 * font, marginBottom: 8 * spacing }]}>
              {t.quitQuizTitle}
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary, fontSize: 14 * font, marginBottom: 18 * spacing }]}>
              {t.quitQuizConfirm}
            </Text>
            <View style={[styles.confirmActions, { gap: 10 * spacing }]}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.background, borderRadius: 12 * radius, paddingVertical: 11 * spacing }]}
                onPress={() => setQuitConfirmVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15 * font }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.error, borderRadius: 12 * radius, paddingVertical: 11 * spacing }]}
                onPress={confirmQuit}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15 * font, fontWeight: '600' }}>{t.quitConfirm}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 再学一次确认 */}
      <Modal
        visible={restartConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRestartConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderRadius: 12 * radius, padding: 20 * spacing }]}>
            <Text style={[styles.confirmTitle, { color: colors.text, fontSize: 17 * font, marginBottom: 8 * spacing }]}>
              {t.studyAgainTitle}
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary, fontSize: 14 * font, marginBottom: 18 * spacing }]}>
              {t.studyAgainConfirm}
            </Text>
            <View style={[styles.confirmActions, { gap: 10 * spacing }]}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.background, borderRadius: 12 * radius, paddingVertical: 11 * spacing }]}
                onPress={() => setRestartConfirmVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15 * font }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.accentStrong, borderRadius: 12 * radius, paddingVertical: 11 * spacing }]}
                onPress={confirmRestart}
                activeOpacity={0.8}
              >
                <Text style={{ color: isDark ? colors.background : '#FFFFFF', fontSize: 15 * font, fontWeight: '600' }}>
                  {t.studyAgainAction}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  swipeArea: {
    flex: 1,
    // 裁切横向位移，避免内容溢出到容器外露出空白
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
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
  restartText: {
    textAlign: 'right',
  },
  previousCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  previousRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
  },
  confirmTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
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
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionMetaLabel: {
    fontSize: 12,
  },
  questionStar: {
    fontSize: 14,
    marginRight: 2,
  },
  questionType: {
    fontSize: 12,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  nextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeHint: {
    textAlign: 'center',
  },
  nextButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
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
