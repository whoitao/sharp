import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@sharp/shared';
import { api } from '../services/api';
import { storage } from '../utils/storage';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  const token = await storage.getToken();
  const user = await storage.getUser();
  return { token, user: user as User | null };
});

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.login(credentials.username, credentials.password);
      console.log('ddddd', response);
      await storage.setToken(response.token);
      await storage.setUser(response.user as unknown as Record<string, unknown>);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.register(credentials.username, credentials.password);
      await storage.setToken(response.token);
      await storage.setUser(response.user as unknown as Record<string, unknown>);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Registration failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      storage.clear();
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // initialize
      .addCase(initializeAuth.fulfilled, (state, action: PayloadAction<{ token: string | null; user: User | null }>) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = !!action.payload.token;
        state.isLoading = false;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
      })
      // login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
