import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import studyReducer from './studySlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    study: studyReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
