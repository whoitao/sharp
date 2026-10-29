import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Question } from '@sharp/shared';
import { api } from '../services/api';

export interface WrongAnswer {
  question: Question;
  selectedKeys: string[];
  correctKeys: string[];
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  wrongAnswers: WrongAnswer[];
}

interface StudyState {
  currentQuestions: Question[];
  currentIndex: number;
  answers: Record<string, { selectedKeys: string[]; correct: boolean }>;
  startTime: number | null;
  categoryId: string | null;
  unitIndex: number | null;
  result: QuizResult | null;
  isLoading: boolean;
}

const initialState: StudyState = {
  currentQuestions: [],
  currentIndex: 0,
  answers: {},
  startTime: null,
  categoryId: null,
  unitIndex: null,
  result: null,
  isLoading: false,
};

export const fetchQuestions = createAsyncThunk(
  'study/fetchQuestions',
  async (params: {
    /** 考纲练习用分类；教材章节练习用 chapterId，二者必填其一 */
    categoryId?: string;
    chapterId?: string;
    unitIndex: number;
    subjectId?: string;
    knowledgePointId?: string;
  }) => {
    const questions = params.chapterId
      ? await api.getChapterQuestions(params.chapterId, params.unitIndex, params.subjectId)
      : await api.getQuestions(
          params.categoryId!,
          params.unitIndex,
          params.subjectId,
          params.knowledgePointId,
        );
    return {
      questions,
      categoryId: params.categoryId ?? null,
      chapterId: params.chapterId ?? null,
      unitIndex: params.unitIndex,
    };
  }
);

const studySlice = createSlice({
  name: 'study',
  initialState,
  reducers: {
    setCurrentIndex(state, action: PayloadAction<number>) {
      state.currentIndex = action.payload;
    },
    recordAnswer(
      state,
      action: PayloadAction<{ questionId: string; selectedKeys: string[]; correct: boolean }>
    ) {
      state.answers[action.payload.questionId] = {
        selectedKeys: action.payload.selectedKeys,
        correct: action.payload.correct,
      };
    },
    finishQuiz(state) {
      const wrongAnswers: WrongAnswer[] = [];
      let correctCount = 0;

      state.currentQuestions.forEach((q) => {
        const answer = state.answers[q.id];
        if (answer) {
          if (answer.correct) {
            correctCount++;
          } else {
            const correctKeys = q.options
              .filter((o) => o.isCorrect)
              .map((o) => o.optionKey);
            wrongAnswers.push({
              question: q,
              selectedKeys: answer.selectedKeys,
              correctKeys,
            });
          }
        }
      });

      const durationSeconds = state.startTime
        ? Math.floor((Date.now() - state.startTime) / 1000)
        : 0;

      state.result = {
        totalQuestions: state.currentQuestions.length,
        correctCount,
        wrongCount: wrongAnswers.length,
        durationSeconds,
        wrongAnswers,
      };
    },
    // 再学一次：保留本次加载的题目，清空作答进度并重新计时
    restartQuiz(state) {
      state.currentIndex = 0;
      state.answers = {};
      state.startTime = Date.now();
      state.result = null;
    },
    resetStudy(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(
        fetchQuestions.fulfilled,
        (
          state,
          action: PayloadAction<{
            questions: Question[];
            categoryId: string | null;
            chapterId: string | null;
            unitIndex: number;
          }>,
        ) => {
          state.isLoading = false;
          state.currentQuestions = action.payload.questions;
          state.categoryId = action.payload.categoryId;
          state.unitIndex = action.payload.unitIndex;
          state.currentIndex = 0;
          state.answers = {};
          state.startTime = Date.now();
          state.result = null;
        }
      )
      .addCase(fetchQuestions.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setCurrentIndex, recordAnswer, finishQuiz, restartQuiz, resetStudy } = studySlice.actions;
export default studySlice.reducer;
