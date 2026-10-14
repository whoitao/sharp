import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Theme } from '@sharp/shared';
import { api } from '../services/api';

interface SettingsState {
  unitSize: number;
  theme: Theme;
  isLoading: boolean;
}

const initialState: SettingsState = {
  unitSize: 20,
  theme: 'light' as Theme,
  isLoading: false,
};

export const loadSettings = createAsyncThunk('settings/load', async () => {
  return await api.getSettings();
});

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (settings: { unitSize?: number; theme?: Theme }) => {
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.unitSize = action.payload.unitSize;
        state.theme = action.payload.theme;
      })
      .addCase(loadSettings.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.unitSize = action.payload.unitSize;
        state.theme = action.payload.theme;
      });
  },
});

export const { setUnitSize, setTheme } = settingsSlice.actions;
export default settingsSlice.reducer;
