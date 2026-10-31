import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@sharp/shared';
import { api } from '../services/api';
import type { RootState } from '../stores';
import { storage } from '../utils/storage';
import { clearStudyCache } from '../utils/studyCache';

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
      // 登录是会话边界：清空分类/科目/知识点缓存，保证本次登录后重新从数据库拉取
      await clearStudyCache();
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
      // 注册后同样是新会话，清空学习页搜索缓存
      await clearStudyCache();
      await storage.setToken(response.token);
      await storage.setUser(response.user as unknown as Record<string, unknown>);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Registration failed');
    }
  }
);

export type AvatarUploadError = 'tooLarge' | 'failed';

export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (file: { uri: string; name: string; type: string }, { getState, rejectWithValue }) => {
    try {
      const avatar = await api.uploadAvatar(file);
      const current = (getState() as RootState).auth.user;
      if (current) {
        await storage.setUser({ ...current, avatar } as unknown as Record<string, unknown>);
      }
      return avatar;
    } catch (err: any) {
      // 413 = 超过服务端 1MB 限制，其它状态码统一按失败处理
      // fetch 路径抛出的错误带 status 字段；网络异常（无 status）也在这里兜底
      if (err?.status !== 413) {
        console.warn('[avatar] upload error:', err?.message ?? err);
      }
      // TEMP-DIAG: 原本这里固定回 'failed'，改成把真实原因带出去
      return rejectWithValue((err?.status === 413 ? 'tooLarge' : `upload: ${err?.message ?? err}`) as string);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (patch: { nickname?: string; gender?: string; phone?: string }, { getState, rejectWithValue }) => {
    try {
      const updated = await api.updateProfile(patch);
      const current = (getState() as RootState).auth.user;
      if (current) {
        await storage.setUser({ ...current, ...updated } as unknown as Record<string, unknown>);
      }
      return updated;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'update failed');
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
      // 退出登录时一并清空学习页搜索缓存，避免下一个账号看到上一个账号的分类/科目数据
      clearStudyCache();
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
      })
      // avatar
      .addCase(uploadAvatar.fulfilled, (state, action: PayloadAction<string>) => {
        if (state.user) {
          state.user.avatar = action.payload;
        }
      })
      // profile（昵称/性别/手机号）
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<{ nickname?: string; gender?: string | null; phone?: string | null }>) => {
        if (state.user) {
          Object.assign(state.user, action.payload);
        }
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
