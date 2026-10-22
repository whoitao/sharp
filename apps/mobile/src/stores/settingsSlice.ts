import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Density, Language, Theme } from '@sharp/shared';
import { api } from '../services/api';

interface SettingsState {
  unitSize: number;
  theme: Theme;
  language: Language;
  density: Density;
  isLoading: boolean;
}

const initialState: SettingsState = {
  unitSize: 20,
  theme: 'light' as Theme,
  language: 'zh' as Language,
  density: 'comfortable' as Density,
  isLoading: false,
};

export const loadSettings = createAsyncThunk('settings/load', async () => {
  return await api.getSettings();
});

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (settings: { unitSize?: number; theme?: Theme; language?: Language; density?: Density }) => {
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.unitSize = action.payload.unitSize ?? state.unitSize;
        state.theme = action.payload.theme ?? state.theme;
        state.language = action.payload.language ?? state.language;
        state.density = action.payload.density ?? state.density;
      })
      .addCase(loadSettings.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.unitSize = action.payload.unitSize ?? state.unitSize;
        state.theme = action.payload.theme ?? state.theme;
        state.language = action.payload.language ?? state.language;
        state.density = action.payload.density ?? state.density;
      });
  },
});

export const { setUnitSize, setTheme, setLanguage, setDensity } = settingsSlice.actions;
export default settingsSlice.reducer;
