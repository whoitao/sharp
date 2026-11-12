import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Density, Language, Theme } from '@sharp/shared';
import { api } from '../services/api';
import type { RootState } from '../stores';
import { clearPendingScopeHint } from '../utils/scopeHintStorage';

interface SettingsState {
  unitSize: number;
  theme: Theme;
  language: Language;
  density: Density;
  /** 全局学习范围：年级（小学一年级 ~ 大学四年级） */
  gradeId: string | null;
  /** 全局学习范围：科目 */
  subjectId: string | null;
  /** 由「我的教材」反推的教材版本（人教版/北师大版…） */
  publisherId: string | null;
  /** 「我的教材」：全局单选的教材 */
  textbookId: string | null;
  /** 首次登录教材引导的处理时间；null = 还没处理过 */
  scopeHintSeenAt: string | null;
  isLoading: boolean;
  /** 是否已完成首次加载，用于区分冷启动门控与后续刷新 */
  initialized: boolean;
  /** 是否成功从服务端拉到设置：拉取失败时不能据此判断「没选教材」 */
  synced: boolean;
}

const initialState: SettingsState = {
  unitSize: 20,
  theme: 'light' as Theme,
  language: 'zh' as Language,
  density: 'comfortable' as Density,
  gradeId: null,
  subjectId: null,
  publisherId: null,
  textbookId: null,
  scopeHintSeenAt: null,
  isLoading: false,
  initialized: false,
  synced: false,
};

export const loadSettings = createAsyncThunk('settings/load', async () => {
  return await api.getSettings();
});

// 三步选择会连续写入年级/科目/教材，串行执行避免后到的旧响应覆盖新值
let settingsWriteChain: Promise<unknown> = Promise.resolve();

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (settings: {
    unitSize?: number;
    theme?: Theme;
    language?: Language;
    density?: Density;
    gradeId?: string | null;
    subjectId?: string | null;
    publisherId?: string | null;
    textbookId?: string | null;
  }) => {
    const task = settingsWriteChain.then(() => api.updateSettings(settings));
    settingsWriteChain = task.catch(() => undefined);
    return await task;
  }
);

/**
 * 首次登录引导处理完成后写服务端；成功后清掉本地「待上报」。
 * 失败时保留本地标记，由下次启动的补报逻辑重试。
 */
export const ackScopeHint = createAsyncThunk(
  'settings/ackScopeHint',
  async (_, { getState }) => {
    const userId = (getState() as RootState).auth.user?.id;
    const result = await api.ackScopeHint();
    if (userId) await clearPendingScopeHint(userId);
    return result;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUnitSize(state, action: PayloadAction<number>) {
      state.unitSize = action.payload;
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
    setDensity(state, action: PayloadAction<Density>) {
      state.density = action.payload;
    },
    setGradeId(state, action: PayloadAction<string | null>) {
      state.gradeId = action.payload;
    },
    setSubjectId(state, action: PayloadAction<string | null>) {
      state.subjectId = action.payload;
    },
    setPublisherId(state, action: PayloadAction<string | null>) {
      state.publisherId = action.payload;
    },
    setTextbookId(state, action: PayloadAction<string | null>) {
      state.textbookId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.initialized = true;
        state.unitSize = action.payload.unitSize ?? state.unitSize;
        state.theme = action.payload.theme ?? state.theme;
        state.language = action.payload.language ?? state.language;
        state.density = action.payload.density ?? state.density;
        state.gradeId = action.payload.gradeId ?? null;
        state.subjectId = action.payload.subjectId ?? null;
        state.publisherId = action.payload.publisherId ?? null;
        state.textbookId = action.payload.textbookId ?? null;
        state.scopeHintSeenAt = action.payload.scopeHintSeenAt ?? null;
        state.synced = true;
      })
      .addCase(loadSettings.rejected, (state) => {
        state.isLoading = false;
        // 拉取失败也要放行界面，否则永久停在启动页
        state.initialized = true;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.unitSize = action.payload.unitSize ?? state.unitSize;
        state.theme = action.payload.theme ?? state.theme;
        state.language = action.payload.language ?? state.language;
        state.density = action.payload.density ?? state.density;
        state.gradeId = action.payload.gradeId ?? null;
        state.subjectId = action.payload.subjectId ?? null;
        state.publisherId = action.payload.publisherId ?? null;
        state.textbookId = action.payload.textbookId ?? null;
        state.scopeHintSeenAt = action.payload.scopeHintSeenAt ?? null;
        state.synced = true;
      })
      .addCase(ackScopeHint.fulfilled, (state, action) => {
        state.scopeHintSeenAt = action.payload.scopeHintSeenAt ?? new Date().toISOString();
        state.synced = true;
      });
  },
});

export const {
  setUnitSize,
  setTheme,
  setLanguage,
  setDensity,
  setGradeId,
  setSubjectId,
  setPublisherId,
  setTextbookId,
} = settingsSlice.actions;
export default settingsSlice.reducer;
