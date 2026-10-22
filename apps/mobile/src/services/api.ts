import type {
  AnswerItem,
  Category,
  Density,
  KnowledgePoint,
  Language,
  LoginResponse,
  PaginatedResponse,
  Question,
  StudyRecord,
  Subject,
  Theme,
  UnitInfo,
  User,
  UserSettings,
} from '@sharp/shared';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { storage } from '../utils/storage';
import { getCached, setCached } from '../utils/studyCache';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://admin.sharp.whoitao.top/";

// ─── Mock data for offline/demo mode ───────────────────────────────────────────
console.log('API_BASE_URL:', API_BASE_URL);
const mockUser: User = {
  id: '1',
  username: 'demo',
  nickname: 'Demo User',
  avatar: null,
  status: 'active' as any,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCategories: Category[] = [
  {
    id: '1',
    name: '小学',
    parentId: '0',
    sortOrder: 1,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 600,
  },
  {
    id: '2',
    name: '初中',
    parentId: '0',
    sortOrder: 2,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 400,
  },
  {
    id: '3',
    name: '高中',
    parentId: '0',
    sortOrder: 3,
    icon: 'book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 400,
  },
];

const mockSubCategories: Category[] = [
  // 小学
  {
    id: '11',
    name: '一年级',
    parentId: '1',
    sortOrder: 1,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '12',
    name: '二年级',
    parentId: '1',
    sortOrder: 2,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '13',
    name: '三年级',
    parentId: '1',
    sortOrder: 3,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '14',
    name: '四年级',
    parentId: '1',
    sortOrder: 4,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '15',
    name: '五年级',
    parentId: '1',
    sortOrder: 5,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '16',
    name: '六年级',
    parentId: '1',
    sortOrder: 6,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  // 初中
  {
    id: '21',
    name: '初一',
    parentId: '2',
    sortOrder: 1,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '22',
    name: '初二',
    parentId: '2',
    sortOrder: 2,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '23',
    name: '初三',
    parentId: '2',
    sortOrder: 3,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '24',
    name: '中考',
    parentId: '2',
    sortOrder: 4,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  // 高中
  {
    id: '31',
    name: '高一',
    parentId: '3',
    sortOrder: 1,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '32',
    name: '高二',
    parentId: '3',
    sortOrder: 2,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '33',
    name: '高三',
    parentId: '3',
    sortOrder: 3,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
  {
    id: '34',
    name: '高考',
    parentId: '3',
    sortOrder: 4,
    icon: 'star',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 100,
    children: [],
  },
];

const mockSubjects: Subject[] = [
  { id: '1', name: '英语', icon: null, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: '数学', icon: null, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: '语文', icon: null, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockKnowledgePoints: KnowledgePoint[] = [
  { id: '1', name: '词汇', parentId: null, subjectId: '1', sortOrder: 0, children: [], questionCount: 0 },
  { id: '2', name: '语法', parentId: null, subjectId: '1', sortOrder: 1, children: [], questionCount: 0 },
  { id: '3', name: '阅读理解', parentId: null, subjectId: '1', sortOrder: 2, children: [], questionCount: 0 },
];

function generateMockQuestions(categoryId: string, unitIndex: number, count: number): Question[] {
  const questions: Question[] = [];
  const catId = parseInt(categoryId);
  for (let i = 0; i < count; i++) {
    const qIndex = unitIndex * count + i + 1;
    questions.push({
      id: `${catId * 1000 + qIndex}`,
      categoryId,
      subjectId: null,
      type: 1,
      content: `第${qIndex}题：以下哪个是 "elucidate" 的正确释义？`,
      analysis: '"elucidate" 意为阐明、解释。',
      difficulty: Math.ceil(Math.random() * 5),
      score: 1,
      sortOrder: i,
      createdAt: new Date().toISOString(),
      options: [
        {
          id: `${catId * 10000 + qIndex * 10 + 1}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'A',
          content: '阐明，解释',
          isCorrect: true,
          sortNo: 1,
        },
        {
          id: `${catId * 10000 + qIndex * 10 + 2}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'B',
          content: '混淆，使模糊',
          isCorrect: false,
          sortNo: 2,
        },
        {
          id: `${catId * 10000 + qIndex * 10 + 3}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'C',
          content: '消除，移除',
          isCorrect: false,
          sortNo: 3,
        },
        {
          id: `${catId * 10000 + qIndex * 10 + 4}`,
          questionId: `${catId * 1000 + qIndex}`,
          optionKey: 'D',
          content: '增加，提升',
          isCorrect: false,
          sortNo: 4,
        },
      ],
    });
  }
  return questions;
}

function generateMockUnits(categoryId: string, totalQuestions: number, unitSize: number): UnitInfo[] {
  const unitCount = Math.ceil(totalQuestions / unitSize);
  const units: UnitInfo[] = [];
  for (let i = 0; i < unitCount; i++) {
    const start = i * unitSize;
    const end = Math.min(start + unitSize, totalQuestions);
    units.push({
      unitIndex: i,
      startIndex: start,
      endIndex: end - 1,
      totalQuestions: end - start,
      answeredCount: i === 0 ? 10 : 0,
      correctCount: i === 0 ? 8 : 0,
      status: i === 0 ? 'in_progress' : i < 2 ? 'completed' : 'not_started',
    });
  }
  return units;
}

// ─── Axios instance ────────────────────────────────────────────────────────────

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await storage.clear();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// ─── API Methods ───────────────────────────────────────────────────────────────

export const api = {
  // Auth
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/app/auth/login', {
        username,
        password,
      });
      return response.data;
    } catch {
      if (username && password) {
        return {
          token: 'mock-jwt-token-' + Date.now(),
          user: { ...mockUser, username },
        };
      }
      throw new Error('Login failed');
    }
  },

  async register(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/app/auth/register', {
        username,
        password,
      });
      return response.data;
    } catch {
      if (username && password) {
        return {
          token: 'mock-jwt-token-' + Date.now(),
          user: { ...mockUser, username },
        };
      }
      throw new Error('Registration failed');
    }
  },

  // Categories
  async getCategories(parentId: string): Promise<Category[]> {
    // 1. 优先读本地缓存（仅缓存真实接口数据）
    const cached = await getCached<Category[]>('categories', parentId);
    if (cached) return cached;

    // 2. 缓存未命中，请求接口
    try {
      const response = await apiClient.get<Category[]>('/api/app/categories', {
        params: { parentId },
      });
      // 仅缓存非空数据，避免异常空响应固化 24 小时
      if (response.data.length > 0) {
        await setCached('categories', response.data, parentId);
      }
      return response.data;
    } catch {
      // 接口失败时临时返回 mock，但不写入缓存，下次仍会重试接口
      return parentId === '0'
        ? mockCategories
        : mockSubCategories.filter((c) => c.parentId === parentId);
    }
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const cached = await getCached<Subject[]>('subjects');
    if (cached) return cached;

    try {
      const response = await apiClient.get<Subject[]>('/api/app/subjects');
      if (response.data.length > 0) {
        await setCached('subjects', response.data);
      }
      return response.data;
    } catch {
      return mockSubjects;
    }
  },

  // Knowledge Points
  async getKnowledgePoints(subjectId?: string): Promise<KnowledgePoint[]> {
    const cached = await getCached<KnowledgePoint[]>('knowledgePoints', subjectId);
    if (cached) return cached;

    try {
      const params = subjectId ? { subjectId } : {};
      const response = await apiClient.get<KnowledgePoint[]>('/api/app/knowledge-points', { params });
      if (response.data.length > 0) {
        await setCached('knowledgePoints', response.data, subjectId);
      }
      return response.data;
    } catch {
      return mockKnowledgePoints;
    }
  },

  // Units
  async getUnits(
    categoryId: string,
    subjectId?: string,
    knowledgePointId?: string
  ): Promise<UnitInfo[]> {
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      if (knowledgePointId) params.knowledgePointId = knowledgePointId;
      const response = await apiClient.get<{ units: UnitInfo[] }>(
        `/api/app/categories/${categoryId}/units`,
        { params },
      );
      return response.data.units;
    } catch {
      // mock 数据均为英语题，选择非英语科目时返回空
      if (subjectId && subjectId !== '1') return [];
      const allCategories = [...mockCategories, ...mockSubCategories];
      const category = allCategories.find((c) => c.id === categoryId);
      const total = category?.questionCount ?? 100;
      return generateMockUnits(categoryId, total, 20);
    }
  },

  // Questions
  async getQuestions(
    categoryId: string,
    unitIndex: number,
    subjectId?: string,
    knowledgePointId?: string
  ): Promise<Question[]> {
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      if (knowledgePointId) params.knowledgePointId = knowledgePointId;
      const response = await apiClient.get<Question[]>(
        `/api/app/categories/${categoryId}/units/${unitIndex}/questions`,
        { params },
      );
      return response.data;
    } catch {
      // mock 数据均为英语题，选择非英语科目时返回空
      if (subjectId && subjectId !== '1') return [];
      return generateMockQuestions(categoryId, unitIndex, 20);
    }
  },

  // Study sessions
  async startStudy(categoryId: string, unitIndex: number): Promise<void> {
    try {
      await apiClient.post('/api/app/study/start', { categoryId, unitIndex });
    } catch {
      // silently succeed in mock mode
    }
  },

  async finishStudy(
    categoryId: string,
    unitIndex: number,
    stats: { correctCount: number; wrongCount: number; durationSeconds: number; answers: AnswerItem[] }
  ): Promise<void> {
    try {
      await apiClient.post('/api/app/study/finish', {
        categoryId,
        unitIndex,
        ...stats,
      });
    } catch {
      // silently succeed in mock mode
    }
  },

  // Study records
  async getStudyRecords(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<StudyRecord>> {
    try {
      const response = await apiClient.get<PaginatedResponse<StudyRecord>>(
        '/api/app/study/records',
        { params: { page, pageSize } }
      );
      return response.data;
    } catch {
      const mockRecords: StudyRecord[] = Array.from({ length: 5 }, (_, i) => ({
        id: `record-${i}`,
        userId: '1',
        categoryId: '1',
        unitIndex: i,
        startedAt: new Date(Date.now() - i * 86400000).toISOString(),
        finishedAt: new Date(Date.now() - i * 86400000 + 600000).toISOString(),
        totalQuestions: 20,
        correctCount: 15 + i,
        wrongCount: 5 - i,
        durationSeconds: 600,
      }));
      return {
        data: mockRecords,
        total: 5,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
    }
  },

  // Stats
  async getStats(): Promise<{
    totalDays: number;
    totalQuestions: number;
    streak: number;
  }> {
    try {
      const response = await apiClient.get('/api/app/study/stats');
      return response.data;
    } catch {
      return {
        totalDays: 15,
        totalQuestions: 320,
        streak: 7,
      };
    }
  },

  // Wrong questions
  async getWrongQuestions(categoryId?: string): Promise<Question[]> {
    try {
      const params = categoryId ? { categoryId } : {};
      const response = await apiClient.get<{
        data: Array<{
          questionId: string;
          categoryId: string;
          status: string;
          lastPracticedAt: string;
          correctCount: number;
          wrongCount: number;
          question: Question;
        }>;
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/api/app/study/wrong-questions', {
        params,
      });
      return response.data.data.map((item) => item.question);
    } catch {
      return generateMockQuestions('1', 0, 5);
    }
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    try {
      const response = await apiClient.get<UserSettings>('/api/app/settings');
      return response.data;
    } catch {
      return {
        userId: '1',
        unitSize: 20,
        theme: 'light' as Theme,
        language: 'zh' as Language,
        density: 'comfortable' as Density,
      };
    }
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const response = await apiClient.put<UserSettings>('/api/app/settings', settings);
      return response.data;
    } catch {
      return {
        userId: '1',
        unitSize: settings.unitSize ?? 20,
        theme: settings.theme ?? ('light' as Theme),
        language: settings.language ?? ('zh' as Language),
        density: settings.density ?? ('comfortable' as Density),
      };
    }
  },
};

export default api;
