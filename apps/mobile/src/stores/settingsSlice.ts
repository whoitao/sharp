import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Density, Language, Theme } from '@sharp/shared';
import { api } from '../services/api';

interface SettingsState {
  unitSize: number;
  theme: Theme;
  language: Language;
  density: Density;
  /** 全局学习范围：年级（小学一年级 ~ 大学四年级） */
  gradeId: string | null;
  /** 全局学习范围：科目 */
  subjectId: string | null;
  /** 「我的教材」：教材版本（人教版/北师大版…） */
  publisherId: string | null;
  isLoading: boolean;
  /** 是否已完成首次加载，用于区分冷启动门控与后续刷新 */
  initialized: boolean;
}

const initialState: SettingsState = {
  unitSize: 20,
  theme: 'light' as Theme,
  language: 'zh' as Language,
  density: 'comfortable' as Density,
  gradeId: null,
  subjectId: null,
  publisherId: null,
  isLoading: false,
  initialized: false,
};

export const loadSettings = createAsyncThunk('settings/load', async () => {
  return await api.getSettings();
});

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
  }) => {
    return await api.updateSettings(settings);
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
} = settingsSlice.actions;
export default settingsSlice.reducer;
